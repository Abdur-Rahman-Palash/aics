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
            console.log('[VERIFY] Starting POST verification');
            console.log('[VERIFY] Business object:', JSON.stringify(business, null, 2));
            // Parse domain once - remove protocol if present
            let domain = business.domain.trim();
            let protocol = 'https://';
            
            console.log('[VERIFY] Original domain:', domain);
            
            if (domain.startsWith('https://')) {
                protocol = 'https://';
                domain = domain.replace('https://', '');
            } else if (domain.startsWith('http://')) {
                protocol = 'http://';
                domain = domain.replace('http://', '');
            }
            
            // Remove trailing slash and path if present
            domain = domain.split('/')[0];
            console.log('[VERIFY] Cleaned domain:', domain, 'Protocol:', protocol);
            console.log('[VERIFY] Verification token:', business.verification?.token);
            
            // Verify domain using specified method
            let isVerified = false;
            console.log('[VERIFY] Using verification method:', method);

            if (method === 'dns') {
                console.log('[VERIFY] Starting DNS TXT verification');
                try {
                    console.log('[VERIFY] Resolving TXT records for:', domain);
                    const txtRecords = await dns.resolveTxt(domain);
                    console.log('[VERIFY] Got TXT records:', JSON.stringify(txtRecords, null, 2));
                    const expectedRecord = `aics-verification=${business.verification.token}`;
                    console.log('[VERIFY] Looking for TXT record:', expectedRecord);
                    
                    // Check all TXT records
                    for (const record of txtRecords) {
                        const joinedRecord = record.join('');
                        console.log('[VERIFY] Checking TXT record part:', joinedRecord);
                        if (joinedRecord.includes(expectedRecord)) {
                            console.log('[VERIFY] Found matching TXT record!');
                            isVerified = true;
                            break;
                        }
                    }
                } catch (dnsError) {
                    console.error('[VERIFY] DNS verification error:', {
                        message: dnsError.message,
                        stack: dnsError.stack,
                        code: dnsError.code
                    });
                }
            } else if (method === 'html') {
                console.log('[VERIFY] Starting HTML file verification');
                try {
                    const https = require('https');
                    const http = require('http');
                    
                    const url = `${protocol}${domain}/aics-verification-${business.verification.token}.html`;
                    console.log('[VERIFY] Checking HTML URL:', url);
                    
                    const httpModule = protocol === 'https://' ? https : http;
                    console.log('[VERIFY] Using HTTP module:', protocol);
                    
                    isVerified = await new Promise((resolve) => {
                        console.log('[VERIFY] Making request to:', url);
                        const request = httpModule.get(url, (response) => {
                            console.log('[VERIFY] HTML request status code:', response.statusCode);
                            resolve(response.statusCode === 200);
                        });
                        
                        request.on('error', (err) => {
                            console.error('[VERIFY] HTML verification request error:', {
                                message: err.message,
                                stack: err.stack,
                                code: err.code
                            });
                            resolve(false);
                        });
                        
                        request.setTimeout(5000, () => {
                            console.warn('[VERIFY] HTML request timed out after 5 seconds');
                            request.destroy();
                            resolve(false);
                        });
                    });
                    console.log('[VERIFY] HTML verification result:', isVerified);
                } catch (httpError) {
                    console.error('[VERIFY] HTML verification error:', {
                        message: httpError.message,
                        stack: httpError.stack,
                        name: httpError.name
                    });
                }
            } else {
                console.error('[VERIFY] Invalid verification method:', method);
                return res.status(400).json({ success: false, error: 'Invalid verification method' });
            }

            console.log('[VERIFY] Final verification result:', isVerified);
            if (isVerified) {
                console.log('[VERIFY] Updating storage with verified status');
                // Update verification status
                storage.updateVerification(businessId, {
                    status: 'verified',
                    method,
                    verifiedAt: new Date().toISOString()
                });
                console.log('[VERIFY] Storage updated successfully');

                return res.status(200).json({ success: true, message: 'Domain verified successfully' });
            } else {
                console.log('[VERIFY] Verification failed, preparing error message');
                const errorMessage = method === 'dns' 
                    ? `Verification failed. Couldn't find TXT record "aics-verification=${business.verification.token}" on ${domain}.`
                    : `Verification failed. Couldn't access ${protocol}${domain}/aics-verification-${business.verification.token}.html. Please make sure the file exists and is publicly accessible.`;
                console.log('[VERIFY] Returning error:', errorMessage);
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