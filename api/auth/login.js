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

// Check for default session secret in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-secret-key-change-this-in-production')) {
    console.warn('WARNING: Using default or missing SESSION_SECRET in production! This is a security risk. Please set a strong SESSION_SECRET in your environment variables.');
}

// Middleware for session handling
const sessionMiddleware = cookieSession({
    name: 'aics-session',
    keys: [process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production'],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
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
        const { email, password } = req.body;
        
        // Validate inputs
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
        }
        if (!password) {
            return res.status(400).json({ success: false, error: 'Password is required' });
        }
        
        const user = await storage.loginUser(email, password);
        req.session.userId = user.id;
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(401).json({ success: false, error: error.message });
    }
};
