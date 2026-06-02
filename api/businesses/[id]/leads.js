const storage = require('../../../lib/storage');

module.exports = async (req, res) => {
    const businessId = req.query.id;

    if (req.method === 'POST') {
        try {
            const newLead = storage.addLead(businessId, req.body);
            if (newLead) {
                res.status(201).json({ success: true, lead: newLead });
            } else {
                res.status(404).json({ success: false, error: 'Business not found' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    } else if (req.method === 'GET') {
        try {
            const leads = storage.getLeadsForBusiness(businessId);
            res.status(200).json({ success: true, leads });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    } else {
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
};
