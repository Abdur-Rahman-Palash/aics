
// Vercel API Route: /api/chat
// Handles chat messages and returns AI responses

const QdrantManager = require('../lib/qdrant');
const GeminiAI = require('../lib/gemini');
const LangChainIntegration = require('../lib/langchain'); 
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

// Simple keyword-based response generator for fallback
function generateFriendlyFallbackResponse(message, contextParts) {
    // Handle basic questions first
    const messageLower = message.toLowerCase();
    if (messageLower.includes('who are you')) {
        return "I'm your AI customer support assistant! I'm here to help you with any questions about this website and its services!";
    }
    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
        return "Hello! How can I help you today?";
    }
    
    if (contextParts.length === 0) {
        return "I'd be happy to help you with that! Let me guide you: \n\nPlease explore the website's main menu to find what you're looking for!";
    }

    // Try to find a relevant chunk based on keywords in the user's message
    let bestChunk = null;
    let bestScore = 0;

    for (const part of contextParts) {
        const partLower = part.toLowerCase();
        let score = 0;
        // Count keywords in the chunk
        if (messageLower.includes('create') && partLower.includes('create')) score += 2;
        if (messageLower.includes('invoice') && partLower.includes('invoice')) score += 2;
        if (messageLower.includes('payment') && partLower.includes('payment')) score += 2;
        if (messageLower.includes('product') && partLower.includes('product')) score += 2;
        if (messageLower.includes('store') && partLower.includes('store')) score += 2;
        if (messageLower.includes('dashboard') && partLower.includes('dashboard')) score += 2;
        if (messageLower.includes('click') && partLower.includes('click')) score += 1;
        if (messageLower.includes('button') && partLower.includes('button')) score += 1;
        if (messageLower.includes('go') && partLower.includes('go')) score += 1;

        if (score > bestScore) {
            bestScore = score;
            bestChunk = part;
        }
    }

    if (bestChunk && bestScore > 0) {
        // Clean up the chunk to make it user-friendly
        let cleanChunk = bestChunk.replace(/\[website\] Source:.*?\s*/, '');
        cleanChunk = cleanChunk.replace(/\[.*?\]/g, ''); // Remove any [type] tags
        cleanChunk = cleanChunk.replace(/https?:\/\/[^\s]+/g, ''); // Remove URLs
        cleanChunk = cleanChunk.replace(/`/g, ''); // Remove backticks
        cleanChunk = cleanChunk.replace(/\s+/g, ' ').trim();

        // Extract key phrases or steps
        // For invoice questions, extract steps like "Go to Dashboard, Click Invoice module"
        if (messageLower.includes('invoice') && messageLower.includes('create')) {
            const steps = [];
            if (cleanChunk.toLowerCase().includes('dashboard')) steps.push('Go to Dashboard');
            if (cleanChunk.toLowerCase().includes('invoice')) steps.push('Click on Invoice module');
            if (cleanChunk.toLowerCase().includes('create')) steps.push('Look for a CREATE button');
            
            if (steps.length > 0) {
                return "Here's how to create an invoice:\n\n" + steps.join('\n');
            }
        }

        // Extract relevant sentences
        const sentences = cleanChunk.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
        if (sentences.length > 0) {
            let relevantSentences = sentences.slice(0, 4); // Take top 4 relevant sentences
            return "Here's what I found to help you:\n\n" + relevantSentences.join('. ') + '.';
        }
    }

    // If no relevant chunk, just return a friendly message
    return "Here's what I found to help you:\n\n" + contextParts[0].substring(0, 300);
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
        const SIMILARITY_THRESHOLD = 0.1; // Slightly higher threshold
        const hasRelevantSimilarity = similarItems.some(item => item.score >= SIMILARITY_THRESHOLD);
        console.log('[CHAT] hasRelevantSimilarity:', hasRelevantSimilarity);
        console.log('[CHAT] All similarity scores:', similarItems.map(item => item.score));

        // Step 2: Use Gemini to classify relevance (two-layer validation)
        let isQuestionRelated = false;
        if (contextParts.length > 0 && config.gemini.apiKey) {
            try {
                isQuestionRelated = await gemini.classifyQuestionRelevance(message, contextParts);
            } catch (error) {
                console.error('[CHAT] Error classifying relevance:', error);
                // If classification fails (rate limit, etc.), trust the similarity score!
                isQuestionRelated = hasRelevantSimilarity;
            }
        } else if (contextParts.length === 0) {
            console.log('[CHAT] No context parts found, defaulting to isQuestionRelated = true');
            isQuestionRelated = true;
        }
        // If similarity score is good, mark as related even if classification says no!
        if (hasRelevantSimilarity && !isQuestionRelated) {
            console.log('[CHAT] Similarity score is good, overriding classification to related!');
            isQuestionRelated = true;
        }
        console.log('[CHAT] isQuestionRelated:', isQuestionRelated);

        // Only mark as needs human help if both similarity and classification say it's unrelated
        const humanTransferMessage = "Sorry, I couldn't find information related to our services.\n\nPlease leave your details and our team will contact you.";
        let needsHumanHelp = false; // Default to false to be safe!
        // Only set to true if both similarity is low AND classification says unrelated
        if (!hasRelevantSimilarity && !isQuestionRelated) {
            needsHumanHelp = true;
        }
        console.log('[CHAT] needsHumanHelp:', needsHumanHelp);

        // Generate AI response
        let aiResponse;

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
                // If we have a direct FAQ match, still use Gemini to make it friendly!
                if (config.gemini.apiKey) {
                    try {
                        const contextWithFAQ = `FAQ - Q: ${directMatch.question}\nA: ${directMatch.answer}`;
                        aiResponse = await gemini.generateResponse(message, contextWithFAQ);
                    } catch (error) {
                        console.warn('[CHAT] Gemini failed for direct match, using raw answer:', error);
                        aiResponse = directMatch.answer;
                    }
                } else {
                    aiResponse = directMatch.answer;
                }
                confidenceScore = 1.0;
                needsHumanHelp = false;
            } else if (contextParts.length > 0) { // If we have ANY context, use Gemini!
                // Always use Gemini to generate a friendly response
                if (config.gemini.apiKey) {
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
                            console.warn('[CHAT] Gemini API failed, using friendly fallback:', geminiError);
                            // Fallback - use our friendly keyword-based generator!
                            aiResponse = generateFriendlyFallbackResponse(message, contextParts);
                            needsHumanHelp = false;
                        }
                    }

                    // Check if AI response mentions human/escalate, set needsHumanHelp if so
                    const hasHumanKeywords = /human|escalate|talk\s+to|contact\s+support|assist\s+further|can't help|don't know|don't have information/i.test(aiResponse);
                    if (hasHumanKeywords) {
                        needsHumanHelp = true;
                    }
                } else {
                    // No API key, still make it friendly
                    aiResponse = "Here's what I found that might help:\n" + contextParts[0].substring(0, 500);
                    needsHumanHelp = false;
                }
            } else { // If no context at all, still be friendly!
                aiResponse = "I'd be happy to help you with that! Let me guide you:\n\n" + 
                    (message.toLowerCase().includes('invoice') ? 
                        "Look for a 'CREATE' button on the home page to start creating your invoice!" : 
                        "Please explore the website's main menu to find what you're looking for!");
                needsHumanHelp = false;
            }
        } catch (error) {
            console.error('[CHAT] Error generating response:', error);
            console.error('[CHAT] Error stack:', error.stack);
            // Final fallback: use our friendly generator!
            aiResponse = generateFriendlyFallbackResponse(message, contextParts);
            needsHumanHelp = false;
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
        // Instead of returning error, return a friendly response!
        return res.status(200).json({
            success: true,
            response: "I'm sorry, something went wrong! Please try again in a moment.",
            needsHumanHelp: false,
            confidence: 0,
            conversationId: conversation ? conversation.id : null,
            context: []
        });
    }
};
