const getStorage = require('../../../../../../lib/storage');

module.exports = async (req, res) => {
    const businessId = req.query.id;
    const conversationId = req.query.conversationId;
    const noteId = req.query.noteId;
    const storage = await getStorage();

    if (req.method === 'DELETE') {
        try {
            const deleted = await storage.deleteConversationNote(businessId, conversationId, noteId);
            if (deleted) {
                res.status(200).json({ success: true });
            } else {
                res.status(404).json({ success: false, error: 'Note not found' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    } else {
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
};
