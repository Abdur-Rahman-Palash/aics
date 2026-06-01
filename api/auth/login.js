const storage = require('../../lib/storage');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }
        const user = await storage.loginUser(email, password);
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ success: false, error: error.message });
    }
};
