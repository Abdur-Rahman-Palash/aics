// Vercel API Route: /api/businesses
// Manages business accounts

const storage = require('../lib/storage');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            // If authenticated, return user's businesses; otherwise return public demo businesses
            if (req.session && req.session.userId) {
                const businesses = storage.getBusinessesForUser(req.session.userId);
                return res.status(200).json({ success: true, businesses });
            } else {
                // Return all businesses for demo purposes when not authenticated
                const businesses = storage.data.businesses;
                return res.status(200).json({ success: true, businesses });
            }
        }

        if (req.method === 'POST') {
            // Check auth for creating businesses
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
            // Create new business
            const { name, domain } = req.body;
            if (!name || !domain) {
                return res.status(400).json({ success: false, error: 'Name and domain are required' });
            }

            const newBusiness = storage.createBusiness(name, domain, req.session.userId);
            return res.status(201).json({ success: true, business: newBusiness });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
