const getStorage = require('../../../../lib/storage');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id: businessId, conversationId } = req.query;
    const storage = await getStorage();

    if (req.method === 'GET') {
      const conversation = await storage.getConversation(businessId, conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
      return res.status(200).json({ success: true, conversation });
    }

    if (req.method === 'PUT') {
      let result;
      if (req.body.tag) {
        if (req.body.remove) {
          result = await storage.removeConversationTag(businessId, conversationId, req.body.tag);
        } else {
          result = await storage.addConversationTag(businessId, conversationId, req.body.tag);
        }
      } else if (req.body.assignee !== undefined) {
        result = await storage.assignConversation(businessId, conversationId, req.body.assignee);
      } else {
        // Fall back to regular update
        result = await storage.updateConversation(businessId, conversationId, req.body);
      }

      if (!result) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      return res.status(200).json({ success: true, conversation: result });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Conversation API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
