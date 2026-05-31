// Vercel API Route: /api/chat
// Handles chat messages and returns AI responses

const QdrantManager = require('../lib/qdrant');
const GeminiAI = require('../lib/gemini');
const storage = require('../lib/storage');
const config = require('../lib/config');

// Demo fallback responses
const demoResponses = {
    en: [
        "Thanks for your message! This is a demo response. To use the full AI features, please set up your GEMINI_API_KEY and Qdrant credentials.",
        "Hello! I'm here to help. This is a demo mode. Configure your API keys for real AI responses.",
        "Great question! For production use, please add your GEMINI_API_KEY and Qdrant configuration to the .env file."
    ],
    bn: [
        "আপনার বার্তার জন্য ধন্যবাদ! এটি একটি ডেমো প্রতিক্রিয়া। পূর্ণ AI বৈশিষ্ট্য ব্যবহার করতে, দয়া করে আপনার GEMINI_API_KEY এবং Qdrant ক্রেডেনশিয়াল সেট আপ করুন।",
        "হ্যালো! আমি সাহায্য করতে এখানে আছি। এটি একটি ডেমো মোড। আসল AI প্রতিক্রিয়ার জন্য আপনার API কী কনফিগার করুন।",
        "দুর্দান্ত প্রশ্ন! প্রোডাকশন ব্যবহারের জন্য, দয়া করে আপনার GEMINI_API_KEY এবং Qdrant কনফিগারেশন .env ফাইলে যোগ করুন।"
    ]
};

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

        // Check if API keys are available for Qdrant/Gemini
        const hasApiKeys = config.gemini.apiKey && config.qdrant.url && config.qdrant.apiKey;

        if (!hasApiKeys) {
            // Demo mode - return random fallback response
            const lang = /[\u0980-\u09FF]/.test(message) ? 'bn' : 'en';
            const responses = demoResponses[lang];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            
            return res.status(200).json({
                success: true,
                response: randomResponse,
                context: []
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
        // Even if there's an error, return a demo response
        const lang = /[\u0980-\u09FF]/.test(req.body.message || '') ? 'bn' : 'en';
        const responses = demoResponses[lang];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        return res.status(200).json({
            success: true,
            response: randomResponse,
            context: []
        });
    }
};
