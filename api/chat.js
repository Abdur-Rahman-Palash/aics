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

        // Search Qdrant for similar FAQs
        const similarFAQs = await qdrant.searchSimilar(queryEmbedding, 5, collectionName);

        // Build context from similar FAQs
        let context = 'No FAQ context available.';
        if (similarFAQs.length > 0) {
            context = similarFAQs.map(faq => 
                `Q: ${faq.question}\nA: ${faq.answer}`
            ).join('\n\n');
        }

        // Generate AI response
        const aiResponse = await gemini.generateResponse(message, context);

        // Record analytics if business ID is provided
        let hitFaqId = null;
        if (similarFAQs.length > 0 && similarFAQs[0].score > 0.7) { // Threshold for considering it a hit
            hitFaqId = similarFAQs[0].faqId;
        }
        if (businessId) {
            storage.recordAnalytics(businessId, hitFaqId);
        }

        return res.status(200).json({
            success: true,
            response: aiResponse,
            context: similarFAQs
        });

    } catch (error) {
        console.error('Error in chat API:', error);
        return res.status(500).json({
            success: false,
            error: 'Something went wrong. Please try again later.'
        });
    }
};
