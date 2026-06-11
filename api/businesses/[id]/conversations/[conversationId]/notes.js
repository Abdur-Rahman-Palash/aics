const getStorage = require('../../../../../lib/storage');

module.exports = async (req, res) => {
    const businessId = req.query.id;
    const conversationId = req.query.conversationId;
    const storage = await getStorage();

    if (req.method === 'GET') {
        try {
            const notes = await storage.getConversationNotes(businessId, conversationId);
            res.status(200).json({ success: true, notes });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    } else if (req.method === 'POST') {
        try {
            const note = await storage.addConversationNote(businessId, conversationId, req.body);
            res.status(201).json({ success: true, note });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    } else {
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
};
