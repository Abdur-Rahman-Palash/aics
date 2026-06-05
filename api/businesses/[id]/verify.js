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
        await new Promise((resolve) => sessionMiddleware(req, res, resolve));
    }
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const businessId = req.params.id || req.query.id;
        const { method } = req.body;

        if (!businessId) {
            return res.status(400).json({ success: false, error: 'Business ID is required' });
        }

        if (!method) {
            return res.status(400).json({ success: false, error: 'Verification method is required' });
        }

        // Check auth
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
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
                    const url = require('url');
                    
                    let targetUrl = `${protocol}${domain}/aics-verification-${business.verification.token}.html`;
                    
                    isVerified = await new Promise((resolve) => {
                        const makeRequest = (currentUrl) => {
                            const parsedUrl = url.parse(currentUrl);
                            const httpModule = parsedUrl.protocol === 'https:' ? https : http;
                            
                            const options = {
                                hostname: parsedUrl.hostname,
                                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                                path: parsedUrl.path,
                                method: 'GET',
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
                                }
                            };
                            
                            const request = httpModule.request(options, (response) => {
                                // Handle redirects (3xx status codes)
                                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                                    const newUrl = url.resolve(currentUrl, response.headers.location);
                                    makeRequest(newUrl);
                                    return;
                                }
                                
                                resolve(response.statusCode === 200);
                            });
                            
                            request.on('error', (err) => {
                                resolve(false);
                            });
                            
                            request.setTimeout(10000, () => { // 10 second timeout for Render environment
                                request.destroy();
                                resolve(false);
                            });
                            
                            request.end();
                        };
                        
                        makeRequest(targetUrl);
                    });
                } catch (httpError) {
                    // If request fails, verification fails
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
        return res.status(500).json({ success: false, error: error.message });
    }
};