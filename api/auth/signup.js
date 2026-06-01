const storage = require('../../lib/storage');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
        }
        const user = await storage.createUser(email, password, name);
        res.status(201).json({ success: true, user });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};
