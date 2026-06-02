// API Route: /api/businesses/[id]/verify
// Verifies domain ownership

const dns = require('dns').promises;
const storage = require('../../../lib/storage');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
            // Verify domain using specified method
            let isVerified = false;

            if (method === 'dns') {
                // DNS TXT record verification
                try {
                    const txtRecords = await dns.resolveTxt(business.domain);
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
                    const protocol = business.domain.startsWith('http') ? '' : 'https://';
                    const url = `${protocol}${business.domain}/aics-verification-${business.verification.token}.html`;
                    
                    const httpModule = url.startsWith('https') ? https : http;
                    
                    isVerified = await new Promise((resolve) => {
                        const request = httpModule.get(url, (response) => {
                            resolve(response.statusCode === 200);
                        });
                        
                        request.on('error', (err) => {
                            resolve(false);
                        });
                        request.setTimeout(5000, () => {
                            request.destroy();
                            resolve(false);
                        });
                    });
                } catch (httpError) {
                    // Error
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
                    ? `Verification failed. Couldn't find TXT record "aics-verification=${business.verification.token}" on ${business.domain}.`
                    : `Verification failed. Couldn't access https://${business.domain}/aics-verification-${business.verification.token}.html. Please make sure the file exists and is publicly accessible.`;
                return res.status(400).json({ success: false, error: errorMessage });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};