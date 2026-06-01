const storage = require('../../../../lib/storage');

module.exports = async (req, res) => {
    if (req.method !== 'PUT') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { id: businessId, leadId } = req.query;
        const { status } = req.body;
        const updatedLead = storage.updateLeadStatus(businessId, leadId, status);
        if (updatedLead) {
            res.status(200).json({ success: true, lead: updatedLead });
        } else {
            res.status(404).json({ success: false, error: 'Lead not found' });
        }
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
