const getStorage = require('../../../../lib/storage');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { id: businessId, triggerId } = req.query;
    const storage = await getStorage();

    if (req.method === 'PUT') {
      const trigger = await storage.updateTrigger(businessId, triggerId, req.body);
      if (!trigger) return res.status(404).json({ success: false, error: 'Trigger not found' });
      return res.status(200).json({ success: true, trigger });
    }

    if (req.method === 'DELETE') {
      const deleted = await storage.deleteTrigger(businessId, triggerId);
      if (!deleted) return res.status(404).json({ success: false, error: 'Trigger not found' });
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Trigger API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
