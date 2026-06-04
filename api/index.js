const app = require('../server');

module.exports = (req, res) => {
  try {
    console.log('[VERCEL] Request:', req.method, req.url);
    app(req, res, (err) => {
      if (err) {
        console.error('[VERCEL] Express error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    });
  } catch (error) {
    console.error('[VERCEL] Unhandled error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
