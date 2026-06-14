// Vercel API Route: /api/businesses/[id]/agents
// Manages team members/agents for a specific business

const getStorage = require('../../../lib/storage');
const cookieSession = require('cookie-session');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // All agent operations require authentication
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const storage = await getStorage();
    const businessId = req.query.id;

    try {
        // Only the owner of the business should manage agents
        const business = await storage.getBusiness(businessId, req.session.userId);
        
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        
        if (business.userId !== req.session.userId) {
            return res.status(403).json({ success: false, error: 'Only business owners can manage team members' });
        }

        if (req.method === 'GET') {
            const agents = await storage.getAgents(businessId);
            return res.status(200).json({ success: true, agents });
        }

        if (req.method === 'POST') {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ success: false, error: 'Email is required' });
            }

            try {
                const newAgent = await storage.addAgent(businessId, email);
                return res.status(201).json({ success: true, agent: newAgent });
            } catch (err) {
                return res.status(400).json({ success: false, error: err.message });
            }
        }

        if (req.method === 'DELETE') {
            const { agentId } = req.body;
            if (!agentId) {
                return res.status(400).json({ success: false, error: 'agentId is required' });
            }

            const deleted = await storage.removeAgent(businessId, agentId);
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Agent not found in this business' });
            }
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
