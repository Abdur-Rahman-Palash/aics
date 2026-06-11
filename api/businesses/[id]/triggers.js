const getStorage = require('../../../lib/storage');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { id: businessId } = req.query;
    const storage = await getStorage();

    if (req.method === 'GET') {
      const triggers = await storage.getTriggers(businessId);
      return res.status(200).json({ success: true, triggers });
    }

    if (req.method === 'POST') {
      const trigger = await storage.addTrigger(businessId, req.body);
      return res.status(201).json({ success: true, trigger });
    }
  } catch (error) {
    console.error('Triggers API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
