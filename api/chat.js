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

        // Determine which collection to use
        let collectionName = config.qdrant.collectionName; // Default
        if (business) {
            collectionName = business.qdrantCollection;
        }

        // Generate embedding for user message
        const queryEmbedding = await gemini.generateEmbedding(message);

        // Search Qdrant for similar content (FAQs + chunks)
        const similarItems = await qdrant.searchSimilar(queryEmbedding, 10, collectionName);

        // Build context from similar items
        let contextParts = [];
        
        // Process similar items
        for (const item of similarItems) {
            if (item.type === 'faq' && item.question && item.answer) {
                contextParts.push(`FAQ - Q: ${item.question}\nA: ${item.answer}`);
            } else if (item.content) {
                contextParts.push(`[${item.type}] Source: ${item.source || 'Unknown'}\n${item.content}`);
            }
        }

        let context = 'No relevant context available.';
        if (contextParts.length > 0) {
            context = contextParts.join('\n\n---\n\n');
        }

        // Generate AI response with enhanced prompt that includes chunk context
        let aiResponse;
        try {
            aiResponse = await gemini.generateResponse(message, context);
        } catch (error) {
            console.error('Error generating AI response:', error);
            // Fallback response
            aiResponse = "I'm sorry, I couldn't generate a response right now. Please try again later.";
        }

        // Record analytics if business ID is provided
        let hitFaqId = null;
        const topFAQ = similarItems.find(item => item.type === 'faq' && item.score > 0.7);
        if (topFAQ) {
            hitFaqId = topFAQ.faqId;
        }
        if (businessId) {
            storage.recordAnalytics(businessId, hitFaqId);
        }

        return res.status(200).json({
            success: true,
            response: aiResponse,
            context: similarItems
        });

    } catch (error) {
        console.error('Error in chat API:', error);
        return res.status(500).json({
            success: false,
            error: 'Something went wrong. Please try again later.'
        });
    }
};
