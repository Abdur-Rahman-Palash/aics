const storage = require('../../lib/storage');

module.exports = (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    res.status(200).json({ success: false, error: 'Session not supported in serverless' });
};
