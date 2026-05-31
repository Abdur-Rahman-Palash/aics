// Vercel API Route: /api/get-faqs
// Retrieves all stored FAQs

const QdrantManager = require('../lib/qdrant');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const qdrant = new QdrantManager();
        await qdrant.init();

        // Get all points from Qdrant
        const collectionName = require('../lib/config').qdrant.collectionName;
        const scrollResult = await qdrant.client.scroll(collectionName, {
            limit: 100,
            with_payload: true
        });

        const faqs = scrollResult.points.map(point => ({
            id: point.id,
            question: point.payload.question,
            answer: point.payload.answer
        }));

        return res.status(200).json({
            success: true,
            faqs: faqs
        });

    } catch (error) {
        console.error('Error retrieving FAQs:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
