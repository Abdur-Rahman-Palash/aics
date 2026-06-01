// Vercel API Route: /api/businesses/[id]/website
// Handles website training for a specific business

const storage = require('../../../lib/storage');

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

    // Auth check
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    try {
        const businessId = req.query.id;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        const newWebsite = storage.addWebsite(businessId, url);

        if (!newWebsite) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }

        // TODO: Implement actual website crawling, content extraction, chunking, embedding, and Qdrant storage here
        // For now, just mark it as completed after a short delay (simulating training)
        setTimeout(() => {
            const business = storage.getBusiness(businessId);
            const websiteIndex = business.knowledgeSources.websites.findIndex(w => w.id === newWebsite.id);
            if (websiteIndex !== -1) {
                business.knowledgeSources.websites[websiteIndex].status = 'completed';
                business.knowledgeSources.websites[websiteIndex].lastTrainedAt = new Date().toISOString();
                storage.save();
            }
        }, 3000);

        return res.status(201).json({ success: true, website: newWebsite });

    } catch (error) {
        console.error('Error in website API:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
