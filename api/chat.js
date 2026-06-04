// Vercel API Route: /api/chat
// Handles chat messages and returns AI responses

const QdrantManager = require('../lib/qdrant');
const GeminiAI = require('../lib/gemini');
const LangChainIntegration = require('../lib/langchain'); // New LangChain integration
const storage = require('../lib/storage');
const config = require('../lib/config');

// Simple function to normalize whitespace
function normalizeWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
}

// Simple function to find matching FAQ from storage
function findMatchingFAQFromStorage(message, business) {
    if (!business || !business.faqs || business.faqs.length === 0) return null;

    const normalizedMessage = normalizeWhitespace(message.toLowerCase());

    for (const faq of business.faqs) {
        // Check English
        if (faq.questionEn) {
            const normalizedQuestionEn = normalizeWhitespace(faq.questionEn.toLowerCase());
            if (normalizedMessage.includes(normalizedQuestionEn) || normalizedQuestionEn.includes(normalizedMessage)) {
                return {
                    question: faq.questionEn,
                    answer: faq.answerEn
                };
            }
        }
        // Check Bangla
        if (faq.questionBn) {
            const normalizedQuestionBn = normalizeWhitespace(faq.questionBn);
            const normalizedMsgBn = normalizeWhitespace(message);
            if (normalizedMsgBn.includes(normalizedQuestionBn) || normalizedQuestionBn.includes(normalizedMsgBn)) {
                return {
                    question: faq.questionBn,
                    answer: faq.answerBn
                };
            }
        }
    }

    return null;
}

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, businessId, conversationId, visitor } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get business from storage if ID is provided
        let business = null;
        if (businessId) {
            business = storage.getBusiness(businessId);
        }

        // Get or create conversation
        let conversation = null;
        if (businessId) {
            if (conversationId) {
                conversation = storage.getConversation(businessId, conversationId);
            }
            if (!conversation) {
                conversation = storage.createConversation(businessId, visitor);
            }
        }

        // First, try to find a matching FAQ from storage (db.json) directly
        const directMatch = findMatchingFAQFromStorage(message, business);
        
        // Initialize services
        const qdrant = new QdrantManager();
        const gemini = new GeminiAI();
        const langchain = new LangChainIntegration(); // New LangChain instance

        // Build context - start with empty
        let contextParts = [];
        let similarItems = [];
        let confidenceScore = 0;

        try {
            // Only try Qdrant and Gemini if config is available
            if (config.gemini.apiKey && config.qdrant.url && config.qdrant.apiKey) {
                // Determine which collection to use
                let collectionName = config.qdrant.collectionName; // Default
                if (business) {
                    collectionName = business.qdrantCollection;
                }

                // Generate embedding for user message
                const queryEmbedding = await gemini.generateEmbedding(message);

                // Search Qdrant for similar content (FAQs + chunks)
                similarItems = await qdrant.searchSimilar(queryEmbedding, 10, collectionName);
                console.log('[CHAT] Found similar items:', JSON.stringify(similarItems, null, 2));

                // Process similar items
                for (const item of similarItems) {
                    if (item.type === 'faq' && item.question && item.answer) {
                        contextParts.push(`FAQ - Q: ${item.question}\nA: ${item.answer}`);
                    } else if (item.content) {
                        contextParts.push(`[${item.type}] Source: ${item.source || 'Unknown'}\n${item.content}`);
                    }
                }

                // Calculate confidence score based on top similarity
                if (similarItems.length > 0) {
                    confidenceScore = similarItems[0].score || 0;
                }
                console.log('[CHAT] Confidence score:', confidenceScore);
                console.log('[CHAT] Context parts:', contextParts);
            }
        } catch (error) {
            // Continue without them - we'll use fallback responses
        }

        let context = 'No relevant context available.';
        if (contextParts.length > 0) {
            context = contextParts.join('\n\n---\n\n');
        }

        // Check similarity threshold - try to use ANY context we find, even low confidence!
        const SIMILARITY_THRESHOLD = 0.05; // Super low to get any possible matches!
        const CONFIDENCE_THRESHOLD = 0.05;
        const humanTransferMessage = "I'm sorry, I can't confidently answer that question. Would you like to leave your contact details so our team can get back to you?";
        const hasRelevantContext = similarItems.some(item => item.score >= SIMILARITY_THRESHOLD);
        let needsHumanHelp = false; // Start with false, only set to true if no response makes sense
        
        // Generate AI response or use fallback
        let aiResponse;
        try {
            if (config.gemini.apiKey) {
                if (directMatch) {
                    aiResponse = directMatch.answer;
                    confidenceScore = 1.0;
                    needsHumanHelp = false;
                } else if (contextParts.length > 0) { // If we have ANY context, try to use it!
                    // Get conversation history for LangChain memory
                    let conversationHistory = [];
                    if (conversation && conversation.messages) {
                        conversationHistory = conversation.messages;
                    }

                    aiResponse = await langchain.generateResponse(
                        message,
                        context,
                        conversationHistory
                    );
                    // Check if AI response mentions human/escalate, set needsHumanHelp if so
                    const hasHumanKeywords = /human|escalate|talk\s+to|contact\s+support|assist\s+further|can't help|don't know/i.test(aiResponse);
                    if (hasHumanKeywords) {
                        needsHumanHelp = true;
                    }
                } else { // If no context at all, show lead form
                    aiResponse = humanTransferMessage;
                    needsHumanHelp = true;
                }
            } else {
                // Fallback if no Gemini API key
                if (directMatch) {
                    aiResponse = directMatch.answer;
                    confidenceScore = 1.0;
                    needsHumanHelp = false;
                } else if (business && business.faqs.length > 0) {
                    aiResponse = "I'm sorry, I couldn't find a direct answer to your question. Please check our FAQ section or contact support.";
                    needsHumanHelp = true;
                } else {
                    aiResponse = "Hi! Thanks for reaching out. Our team will get back to you soon.";
                    needsHumanHelp = true;
                }
            }
        } catch (error) {
            // Fallback response
            aiResponse = "I'm sorry, I couldn't generate a response right now. Please try again later.";
        }

        // Record analytics if business ID is provided (try/catch to not crash)
        try {
            let hitFaqId = null;
            const topFAQ = similarItems.find(item => item.type === 'faq' && item.score > 0.7);
            if (topFAQ) {
                hitFaqId = topFAQ.faqId;
            }
            if (businessId) {
                storage.recordAnalytics(businessId, hitFaqId, !needsHumanHelp, needsHumanHelp);
            }
        } catch (error) {
            // Error recording analytics
        }

        // Store unanswered question if needed
        if (businessId && needsHumanHelp && !directMatch) {
            storage.addUnansweredQuestion(businessId, message);
        }

        // Add messages to conversation
        if (conversation && businessId) {
            storage.addMessageToConversation(businessId, conversation.id, {
                role: 'user',
                content: message
            });
            storage.addMessageToConversation(businessId, conversation.id, {
                role: 'ai',
                content: aiResponse,
                confidence: confidenceScore
            });
            
            // Update conversation status
            if (needsHumanHelp) {
                storage.updateConversation(businessId, conversation.id, {
                    status: 'pending'
                });
            }
        }

        return res.status(200).json({
            success: true,
            response: aiResponse,
            needsHumanHelp,
            confidence: confidenceScore,
            conversationId: conversation ? conversation.id : null,
            context: similarItems
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Something went wrong. Please try again later.'
        });
    }
};
