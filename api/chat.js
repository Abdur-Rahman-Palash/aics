// Vercel API Route: /api/chat
// Handles chat messages and returns AI responses

const QdrantManager = require('../lib/qdrant');
const GeminiAI = require('../lib/gemini');
const LangChainIntegration = require('../lib/langchain'); // New LangChain integration
const getStorage = require('../lib/storage');
const config = require('../lib/config');

// Initialize services once when the module loads
let storage;
let qdrant;
let gemini;
let langchain;

// Initialize services async on first request
async function initializeServices() {
    if (!storage) storage = await getStorage();
    if (!qdrant) qdrant = new QdrantManager();
    if (!gemini) gemini = new GeminiAI();
    if (!langchain) langchain = new LangChainIntegration();
}

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
    // Initialize services (if not already initialized)
    await initializeServices();
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
            business = await storage.getBusiness(businessId);
        }

        // Get or create conversation
        let conversation = null;
        if (businessId) {
            if (conversationId) {
                conversation = await storage.getConversation(businessId, conversationId);
            }
            if (!conversation) {
                conversation = await storage.createConversation(businessId, visitor);
            }
        }

        // First, try to find a matching FAQ from storage (db.json) directly
        const directMatch = findMatchingFAQFromStorage(message, business);

        // Build context - start with empty
        let contextParts = [];
        let similarItems = [];
        let confidenceScore = 0;

        try {
            // Only try if gemini api key is available (we're using local vector storage now!)
            if (config.gemini.apiKey) {
                // Determine which collection to use
                let collectionName = config.qdrant.collectionName; // Default
                if (business) {
                    collectionName = business.qdrantCollection;
                }
                console.log('[CHAT] Using collection:', collectionName);

                // Generate embedding for user message
                const queryEmbedding = await gemini.generateEmbedding(message);
                console.log('[CHAT] Generated query embedding');

                // Search Local Vector Storage for similar content (FAQs + chunks)
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
            console.error('[CHAT] Error in vector search:', error);
            // Continue without them - we'll use fallback responses
        }

        let context = 'No relevant context available.';
    if (contextParts.length > 0) {
      context = contextParts.join('\n\n---\n\n');
    }

    // Step 1: Check similarity threshold
    const SIMILARITY_THRESHOLD = 0.05;
    const hasRelevantSimilarity = similarItems.some(item => item.score >= SIMILARITY_THRESHOLD);

    // Step 2: Use Gemini to classify relevance (two-layer validation)
    let isQuestionRelated = false;
    if (contextParts.length > 0 && config.gemini.apiKey) {
      try {
        isQuestionRelated = await gemini.classifyQuestionRelevance(message, contextParts);
      } catch (error) {
        console.error('[CHAT] Error classifying relevance:', error);
        // If classification fails, fall back to similarity only
        isQuestionRelated = hasRelevantSimilarity;
      }
    }

    // If either step indicates it's unrelated, show lead form
    const humanTransferMessage = "Sorry, I couldn't find information related to our services.\n\nPlease leave your details and our team will contact you.";
    let needsHumanHelp = !isQuestionRelated;
        
        // Generate AI response or use fallback
        let aiResponse;
        // 🔑 Keyword matching fallback - works even without API!
        function findAnswerFromContext(msg, ctxParts) {
            const normalizedMsg = msg.toLowerCase();
            let bestMatch = null;
            let bestMatchScore = 0;
            
            // Look for questions in our context chunks (since your PDF is FAQ-style)
            for (let part of ctxParts) {
                // Check if this part contains a Q&A pair (more precise matching)
                const qMatches = [...part.matchAll(/Q:\s*(.+?)\s*A:\s*(.+?)(?=\s*Q:|$)/gis)];
                for (const qMatch of qMatches) {
                    const question = qMatch[1].toLowerCase().trim();
                    const answer = qMatch[2].trim();
                    
                    // Check if user's question is similar to this FAQ question
                    const msgWords = normalizedMsg.split(/\s+/).filter(w => w.length > 2);
                    const qWords = question.split(/\s+/).filter(w => w.length > 2);
                    const matches = msgWords.filter(w => qWords.includes(w));
                    const score = matches.length;
                    
                    if (score > bestMatchScore && score >= 2) {
                        bestMatchScore = score;
                        bestMatch = answer;
                    }
                }
                
                // Check for keywords in the part (only if no Q&A match)
                if (!bestMatch) {
                    const partLower = part.toLowerCase();
                    const keywords = normalizedMsg.split(/\s+/).filter(w => w.length > 2);
                    const hasEnoughKeywords = keywords.filter(k => partLower.includes(k)).length >= 2;
                    if (hasEnoughKeywords) {
                        // Extract the relevant part
                        const sentences = part.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
                        const relevantSentences = sentences.filter(s => 
                            keywords.some(k => s.toLowerCase().includes(k))
                        );
                        if (relevantSentences.length > 0) {
                            bestMatch = relevantSentences.join('. ') + '.';
                            bestMatchScore = 1;
                        }
                    }
                }
            }
            
            return bestMatch;
        }
        
        try {
            if (needsHumanHelp && !isQuestionRelated) {
                // Unrelated question - generate helpful response with suggestions
                if (config.gemini.apiKey) {
                    try {
                        aiResponse = await gemini.generateUnrelatedResponse(message);
                        console.log('[CHAT] Unrelated response generated:', aiResponse);
                    } catch (error) {
                        console.warn('[CHAT] Error generating unrelated response:', error);
                        aiResponse = humanTransferMessage;
                    }
                } else {
                    aiResponse = humanTransferMessage;
                }
            } else if (directMatch) {
                aiResponse = directMatch.answer;
                confidenceScore = 1.0;
                needsHumanHelp = false;
            } else if (contextParts.length > 0) { // If we have ANY context, try to use it!
                // First try our keyword fallback
                const keywordAnswer = findAnswerFromContext(message, contextParts);
                if (keywordAnswer) {
                    console.log('[CHAT] Found answer via keyword matching!');
                    aiResponse = keywordAnswer;
                    needsHumanHelp = false;
                    confidenceScore = 0.8;
                } 
                // If keyword didn't find, try AI (if API is available)
                else if (config.gemini.apiKey) {
                    // Get conversation history for LangChain memory
                    let conversationHistory = [];
                    if (conversation && conversation.messages) {
                        conversationHistory = conversation.messages;
                    }

                    try {
                        console.log('[CHAT] Calling langchain.generateResponse');
                        aiResponse = await langchain.generateResponse(
                            message,
                            context,
                            conversationHistory
                        );
                        console.log('[CHAT] langchain.generateResponse returned:', aiResponse);
                    } catch (langchainError) {
                        console.warn('[CHAT] Langchain failed, falling back to direct gemini.js', langchainError);
                        try {
                            aiResponse = await gemini.generateResponse(message, context);
                            console.log('[CHAT] Direct gemini.generateResponse returned:', aiResponse);
                        } catch (geminiError) {
                            console.warn('[CHAT] Gemini API failed, using last resort: keyword fallback', geminiError);
                            // Last resort - just return the top context chunk
                            aiResponse = "Based on your document, here's the relevant information: " + contextParts[0].substring(0, 500);
                            needsHumanHelp = true;
                        }
                    }
                    
                    // Check if AI response mentions human/escalate, set needsHumanHelp if so
                    const hasHumanKeywords = /human|escalate|talk\s+to|contact\s+support|assist\s+further|can't help|don't know|don't have information/i.test(aiResponse);
                    if (hasHumanKeywords) {
                        needsHumanHelp = true;
                    }
                } else {
                    // No API key, just return the top context
                    aiResponse = "Based on your document, here's the relevant information: " + contextParts[0].substring(0, 500);
                    needsHumanHelp = true;
                }
            } else { // If no context at all, show lead form
                aiResponse = humanTransferMessage;
                needsHumanHelp = true;
            }
        } catch (error) {
            console.error('[CHAT] Error generating response:', error);
            console.error('[CHAT] Error stack:', error.stack);
            // Final fallback: try keyword matching or return context
            const keywordAnswer = findAnswerFromContext(message, contextParts);
            if (keywordAnswer) {
                aiResponse = keywordAnswer;
                needsHumanHelp = false;
            } else if (contextParts.length > 0) {
                aiResponse = "Based on your document, here's the relevant information: " + contextParts[0].substring(0, 500);
                needsHumanHelp = true;
            } else {
                aiResponse = "I'm sorry, I couldn't generate a response right now. Please try again later. Error: " + error.message;
            }
        }

        // Record analytics if business ID is provided (try/catch to not crash)
        try {
            let hitFaqId = null;
            const topFAQ = similarItems.find(item => item.type === 'faq' && item.score > 0.7);
            if (topFAQ) {
                hitFaqId = topFAQ.faqId;
            }
            if (businessId) {
                await storage.recordAnalytics(businessId, hitFaqId, !needsHumanHelp, needsHumanHelp);
            }
        } catch (error) {
            // Error recording analytics
        }

        // Store unanswered question if needed
        if (businessId && needsHumanHelp && !directMatch) {
            await storage.addUnansweredQuestion(businessId, message);
        }

        // Add messages to conversation
        if (conversation && businessId) {
            await storage.addMessageToConversation(businessId, conversation.id, {
                role: 'user',
                content: message
            });
            await storage.addMessageToConversation(businessId, conversation.id, {
                role: 'ai',
                content: aiResponse,
                confidence: confidenceScore
            });
            
            // Update conversation status
            if (needsHumanHelp) {
                await storage.updateConversation(businessId, conversation.id, {
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
        console.error('[CHAT] FATAL ERROR:', error);
        console.error('[CHAT] FATAL ERROR STACK:', error.stack);
        // Instead of returning error, return a response that triggers lead form!
        return res.status(200).json({
            success: true,
            response: "I'm sorry, I can't confidently answer that question. Would you like to leave your contact details so our team can get back to you?",
            needsHumanHelp: true,
            confidence: 0,
            conversationId: conversation ? conversation.id : null,
            context: []
        });
    }
};
