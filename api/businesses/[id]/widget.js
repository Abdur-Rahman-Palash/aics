// Vercel API Route: /api/businesses/[id]/widget
// Manages widget settings for a specific business

const storage = require('../../../lib/storage');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
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

        if (req.method === 'GET') {
            // Get widget settings
            return res.status(200).json({
                success: true,
                settings: business.widgetSettings
            });
        }

        if (req.method === 'PUT') {
            // Update widget settings
            const updatedSettings = storage.updateWidgetSettings(businessId, req.body);
            return res.status(200).json({
                success: true,
                settings: updatedSettings
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Error in widget settings API:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
