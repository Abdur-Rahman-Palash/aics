const storage = require('../../lib/storage');
const cookieSession = require('cookie-session');
require('dotenv').config();

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory rate limiter for Vercel (serverless)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // 5 requests per window

function isRateLimited(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    let requests = rateLimitMap.get(ip) || [];
    requests = requests.filter(time => time > windowStart);
    
    if (requests.length >= RATE_LIMIT_MAX) {
        return true;
    }
    
    requests.push(now);
    rateLimitMap.set(ip, requests);
    return false;
}

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

    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
        return res.status(429).json({ success: false, error: 'Too many requests, please try again later.' });
    }

    try {
        const { email, password, name } = req.body;
        
        // Validate inputs
        if (!name || name.length < 2) {
            return res.status(400).json({ success: false, error: 'Name must be at least 2 characters long' });
        }
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
        }
        
        const user = await storage.createUser(email, password, name);
        req.session.userId = user.id;
        res.status(201).json({ success: true, user });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};
