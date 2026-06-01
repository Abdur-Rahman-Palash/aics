const storage = require('../../lib/storage');
const cookieSession = require('cookie-session');
require('dotenv').config();

// Middleware for session handling
const sessionMiddleware = cookieSession({
    name: 'aics-session',
    keys: [process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production'],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
});

module.exports = async (req, res) => {
    // Apply session middleware
    await new Promise((resolve) => sessionMiddleware(req, res, resolve));

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Not logged in' });
    }

    const user = storage.getUserById(req.session.userId);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Not logged in' });
    }

    res.status(200).json({ success: true, user });
};
