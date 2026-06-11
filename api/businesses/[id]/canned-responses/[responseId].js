const getStorage = require('../../../../lib/storage');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id: businessId, responseId } = req.query;
    const storage = await getStorage();

    if (req.method === 'PUT') {
      const response = await storage.updateCannedResponse(businessId, responseId, req.body);
      if (!response) {
        return res.status(404).json({ success: false, error: 'Canned response not found' });
      }
      return res.status(200).json({ success: true, response });
    } else if (req.method === 'DELETE') {
      const deleted = await storage.deleteCannedResponse(businessId, responseId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Canned response not found' });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Canned response API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
