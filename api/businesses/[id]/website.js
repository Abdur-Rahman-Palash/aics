// Vercel API Route: /api/businesses/[id]/website
// Handles website training for a specific business

const getStorage = require('../../../lib/storage');
const { trainWebsite } = require('../../../lib/training');
const cookieSession = require('cookie-session');
require('dotenv').config();

// Check for default session secret in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-secret-key-change-this-in-production')) {
    console.warn('WARNING: Using default or missing SESSION_SECRET in production! This is a security risk. Please set a strong SESSION_SECRET in your environment variables.');
}

// Middleware for session handling
const sessionMiddleware = cookieSession({
    name: 'aics-session',
    keys: [process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production'],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
});

module.exports = async (req, res) => {
    // Apply session middleware only if not already present (for serverless)
    if (!req.session) {
        await new Promise((resolve) => sessionMiddleware(req, res, resolve));
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const storage = await getStorage();

    try {
        const businessId = req.query.id;
        
        // Check authentication
        if (!req.session || !req.session.userId) {
            console.error('[Website] Unauthorized: no session userId');
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        const business = await storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            console.error('[Website] Business not found');
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        const newWebsite = await storage.addWebsite(businessId, url);

            if (!newWebsite) {
                return res.status(404).json({ success: false, error: 'Business not found' });
            }

            // Try to run training (with timeout for serverless)
            try {
                console.log('Starting website training for', url);
                
                // Run actual training - increase timeout to 60 seconds for local testing!
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Training timed out')), 60000)
                );
                console.log('Calling trainWebsite');
                const trainingPromise = trainWebsite(businessId, url, business.qdrantCollection);
                const result = await Promise.race([trainingPromise, timeoutPromise]);
                console.log('Training complete:', result);

                // Update status to completed
                // For Neon storage, we need to update the knowledge source
                if (process.env.DATABASE_URL) {
                    const client = await storage.pool.connect();
                    try {
                        await client.query(
                            'UPDATE knowledge_sources SET status = $1, last_trained_at = $2, chunks_count = $3 WHERE id = $4',
                            ['completed', new Date().toISOString(), result.chunksCount, newWebsite.id]
                        );
                    } finally {
                        client.release();
                    }
                } else if (storage.save) {
                    // For JSON storage
                    const businessRef = await storage.getBusiness(businessId);
                    const websiteIndex = businessRef.knowledgeSources.websites.findIndex(w => w.id === newWebsite.id);
                    if (websiteIndex !== -1) {
                        businessRef.knowledgeSources.websites[websiteIndex].status = 'completed';
                        businessRef.knowledgeSources.websites[websiteIndex].lastTrainedAt = new Date().toISOString();
                        businessRef.knowledgeSources.websites[websiteIndex].chunksCount = result.chunksCount;
                    }
                    storage.save();
                }

            } catch (error) {
                console.error('Website training failed:', error);
                
                // Update status to failed
                if (process.env.DATABASE_URL) {
                    const client = await storage.pool.connect();
                    try {
                        await client.query(
                            'UPDATE knowledge_sources SET status = $1, error = $2 WHERE id = $3',
                            ['failed', error.message, newWebsite.id]
                        );
                    } finally {
                        client.release();
                    }
                } else if (storage.save) {
                    const businessRef = await storage.getBusiness(businessId);
                    const websiteIndex = businessRef.knowledgeSources.websites.findIndex(w => w.id === newWebsite.id);
                    if (websiteIndex !== -1) {
                        businessRef.knowledgeSources.websites[websiteIndex].status = 'failed';
                        businessRef.knowledgeSources.websites[websiteIndex].error = error.message;
                    }
                    storage.save();
                }
            }

        return res.status(201).json({ success: true, website: newWebsite });

    } catch (error) {
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
