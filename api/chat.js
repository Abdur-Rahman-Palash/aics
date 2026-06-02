// Vercel API Route: /api/chat
// Handles chat messages and returns AI responses

const QdrantManager = require('../lib/qdrant');
const GeminiAI = require('../lib/gemini');
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
        const { message, businessId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get business from storage if ID is provided
        let business = null;
        if (businessId) {
            business = storage.getBusiness(businessId);
        }

        // First, try to find a matching FAQ from storage (db.json) directly
        const directMatch = findMatchingFAQFromStorage(message, business);
        if (directMatch) {
            // If we find a direct match, just use that answer!
            return res.status(200).json({
                success: true,
                response: directMatch.answer,
                context: [directMatch]
            });
        }

        // Initialize services
        const qdrant = new QdrantManager();
        const gemini = new GeminiAI();

        // Build context - start with empty
        let contextParts = [];
        let similarItems = [];

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

                // Process similar items
                for (const item of similarItems) {
                    if (item.type === 'faq' && item.question && item.answer) {
                        contextParts.push(`FAQ - Q: ${item.question}\nA: ${item.answer}`);
                    } else if (item.content) {
                        contextParts.push(`[${item.type}] Source: ${item.source || 'Unknown'}\n${item.content}`);
                    }
                }
            }
        } catch (error) {
            // Continue without them - we'll use fallback responses
        }

        let context = 'No relevant context available.';
        if (contextParts.length > 0) {
            context = contextParts.join('\n\n---\n\n');
        }

        // Check similarity threshold - if no relevant context found, offer talk to human
        const SIMILARITY_THRESHOLD = 0.5;
        const humanTransferMessage = "I'm sorry, I can only assist with topics related to our business. Please talk to a human agent for other questions.";
        const hasRelevantContext = similarItems.some(item => item.score >= SIMILARITY_THRESHOLD);
        
        // Generate AI response or use fallback
        let aiResponse;
        try {
            if (config.gemini.apiKey) {
                if (!hasRelevantContext || similarItems.length === 0) {
                    aiResponse = humanTransferMessage;
                } else {
                    aiResponse = await gemini.generateResponse(message, context);
                }
            } else {
                // Fallback if no Gemini API key
                if (business && business.faqs.length > 0) {
                    aiResponse = "I'm sorry, I couldn't find a direct answer to your question. Please check our FAQ section or contact support.";
                } else {
                    aiResponse = "Hi! Thanks for reaching out. Our team will get back to you soon.";
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
                storage.recordAnalytics(businessId, hitFaqId);
            }
        } catch (error) {
            // Error recording analytics
        }

        return res.status(200).json({
            success: true,
            response: aiResponse,
            context: similarItems
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Something went wrong. Please try again later.'
        });
    }
};
