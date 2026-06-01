// Vercel API Route: /api/businesses/[id]/website
// Handles website training for a specific business

const storage = require('../../../lib/storage');
const { trainWebsite } = require('../../../lib/training');

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
        const businessId = req.query.id;
        
        // Check authentication
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
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

            // Try to run training (with timeout for serverless)
            try {
                // Update status to training
                const businessRef = storage.getBusiness(businessId);
                const websiteIndex = businessRef.knowledgeSources.websites.findIndex(w => w.id === newWebsite.id);
                if (websiteIndex !== -1) {
                    businessRef.knowledgeSources.websites[websiteIndex].status = 'training';
                    storage.save();
                }

                // Run actual training with timeout (10 seconds for serverless)
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Training timed out')), 10000)
                );
                const trainingPromise = trainWebsite(businessId, url, businessRef.qdrantCollection);
                const result = await Promise.race([trainingPromise, timeoutPromise]);

                // Update status to completed
                const businessRef2 = storage.getBusiness(businessId);
                const websiteIndex2 = businessRef2.knowledgeSources.websites.findIndex(w => w.id === newWebsite.id);
                if (websiteIndex2 !== -1) {
                    businessRef2.knowledgeSources.websites[websiteIndex2].status = 'completed';
                    businessRef2.knowledgeSources.websites[websiteIndex2].lastTrainedAt = new Date().toISOString();
                    businessRef2.knowledgeSources.websites[websiteIndex2].chunksCount = result.chunksCount;
                    storage.save();
                }

                console.log('Website training completed:', url);
            } catch (error) {
                console.error('Website training failed:', error);
                // Update status to failed
                const businessRef = storage.getBusiness(businessId);
                const websiteIndex = businessRef.knowledgeSources.websites.findIndex(w => w.id === newWebsite.id);
                if (websiteIndex !== -1) {
                    businessRef.knowledgeSources.websites[websiteIndex].status = 'failed';
                    businessRef.knowledgeSources.websites[websiteIndex].error = error.message;
                    storage.save();
                }
            }

        return res.status(201).json({ success: true, website: newWebsite });

    } catch (error) {
        console.error('Error in website API:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
