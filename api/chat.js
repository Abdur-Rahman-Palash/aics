// Vercel API Route: /api/chat
// Handles chat messages and returns AI responses

const QdrantManager = require('../lib/qdrant');
const GeminiAI = require('../lib/gemini');

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
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Initialize services
        const qdrant = new QdrantManager();
        const gemini = new GeminiAI();

        // Generate embedding for user message
        const queryEmbedding = await gemini.generateEmbedding(message);

        // Search Qdrant for similar FAQs
        const similarFAQs = await qdrant.searchSimilar(queryEmbedding);

        // Build context from similar FAQs
        let context = 'No FAQ context available.';
        if (similarFAQs.length > 0) {
            context = similarFAQs.map(faq => 
                `Q: ${faq.question}\nA: ${faq.answer}`
            ).join('\n\n');
        }

        // Generate AI response
        const aiResponse = await gemini.generateResponse(message, context);

        return res.status(200).json({
            success: true,
            response: aiResponse,
            context: similarFAQs
        });

    } catch (error) {
        console.error('Error in chat API:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
