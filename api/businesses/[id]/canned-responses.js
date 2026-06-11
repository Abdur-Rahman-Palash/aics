const getStorage = require('../../../lib/storage');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id: businessId } = req.query;
    const storage = await getStorage();

    if (req.method === 'GET') {
      const responses = await storage.getCannedResponses(businessId);
      return res.status(200).json({ success: true, responses });
    } else if (req.method === 'POST') {
      const response = await storage.addCannedResponse(businessId, req.body);
      return res.status(201).json({ success: true, response });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Canned responses API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
