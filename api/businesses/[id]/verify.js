// API Route: /api/businesses/[id]/verify
// Verifies domain ownership

const dns = require('dns').promises;
const cookieSession = require('cookie-session');
const storage = require('../../../lib/storage');
require('dotenv').config();

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
    // Apply session middleware only if not already present (for serverless)
    if (!req.session) {
        console.log('[VERIFY] Applying session middleware');
        await new Promise((resolve) => sessionMiddleware(req, res, resolve));
    } else {
        console.log('[VERIFY] Session already exists (from server.js)');
    }
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');

    console.log('[VERIFY] Incoming request:', {
        method: req.method,
        params: req.params,
        query: req.query,
        body: req.body,
        hasSession: !!req.session,
        sessionUserId: req.session?.userId,
        headers: req.headers,
    });

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('[VERIFY] Parsing request...');
        const businessId = req.params.id || req.query.id;
        console.log('[VERIFY] businessId:', businessId);
        
        const { method } = req.body;
        console.log('[VERIFY] method from body:', method);

        if (!businessId) {
            console.error('[VERIFY] Missing businessId');
            return res.status(400).json({ success: false, error: 'Business ID is required', debug: { params: req.params, query: req.query } });
        }

        if (!method) {
            console.error('[VERIFY] Missing verification method');
            return res.status(400).json({ success: false, error: 'Verification method is required', debug: { body: req.body } });
        }

        // Check auth
        console.log('[VERIFY] Checking auth...');
        if (!req.session || !req.session.userId) {
            console.error('[VERIFY] Unauthorized: no session userId');
            return res.status(401).json({ success: false, error: 'Unauthorized', debug: { hasSession: !!req.session, userId: req.session?.userId, cookies: req.headers.cookie } });
        }
        console.log('[VERIFY] Authenticated as:', req.session.userId);

        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            console.error('[VERIFY] Business not found');
            return res.status(404).json({ success: false, error: 'Business not found', debug: { businessId } });
        }

        if (req.method === 'POST') {
            // Parse domain once - remove protocol if present
            let domain = business.domain.trim();
            let protocol = 'https://';
            
            if (domain.startsWith('https://')) {
                protocol = 'https://';
                domain = domain.replace('https://', '');
            } else if (domain.startsWith('http://')) {
                protocol = 'http://';
                domain = domain.replace('http://', '');
            }
            
            // Remove trailing slash and path if present
            domain = domain.split('/')[0];
            
            // Verify domain using specified method
            let isVerified = false;

            if (method === 'dns') {
                // DNS TXT record verification
                try {
                    const txtRecords = await dns.resolveTxt(domain);
                    const expectedRecord = `aics-verification=${business.verification.token}`;
                    
                    // Check all TXT records
                    for (const record of txtRecords) {
                        const joinedRecord = record.join('');
                        if (joinedRecord.includes(expectedRecord)) {
                            isVerified = true;
                            break;
                        }
                    }
                } catch (dnsError) {
                    // If domain doesn't exist or no TXT records, verification fails
                }
            } else if (method === 'html') {
                // HTML file verification (check for aics-verification-[token].html)
                try {
                    const https = require('https');
                    const http = require('http');
                    
                    const url = `${protocol}${domain}/aics-verification-${business.verification.token}.html`;
                    
                    const httpModule = protocol === 'https://' ? https : http;
                    
                    isVerified = await new Promise((resolve) => {
                        const request = httpModule.get(url, (response) => {
                            resolve(response.statusCode === 200);
                        });
                        
                        request.on('error', (err) => {
                            console.log('[VERIFY] HTML verification error:', err.message);
                            resolve(false);
                        });
                        
                        request.setTimeout(5000, () => {
                            request.destroy();
                            resolve(false);
                        });
                    });
                } catch (httpError) {
                    console.log('[VERIFY] HTTP error:', httpError);
                }
            } else {
                return res.status(400).json({ success: false, error: 'Invalid verification method' });
            }

            if (isVerified) {
                // Update verification status
                storage.updateVerification(businessId, {
                    status: 'verified',
                    method,
                    verifiedAt: new Date().toISOString()
                });

                return res.status(200).json({ success: true, message: 'Domain verified successfully' });
            } else {
                const errorMessage = method === 'dns' 
                    ? `Verification failed. Couldn't find TXT record "aics-verification=${business.verification.token}" on ${domain}.`
                    : `Verification failed. Couldn't access ${protocol}${domain}/aics-verification-${business.verification.token}.html. Please make sure the file exists and is publicly accessible.`;
                return res.status(400).json({ success: false, error: errorMessage });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('[VERIFY] Unexpected error:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
        });
        return res.status(500).json({ success: false, error: error.message });
    }
};