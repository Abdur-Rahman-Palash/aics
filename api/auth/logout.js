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

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    req.session = null;
    res.clearCookie('aics-session');
    res.status(200).json({ success: true });
};
