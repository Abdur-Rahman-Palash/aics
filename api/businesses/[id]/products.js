// Vercel API Route: /api/businesses/[id]/products
// Manages Product Catalog for a specific business

const getStorage = require('../../../lib/storage');
const cookieSession = require('cookie-session');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const storage = await getStorage();
    const businessId = req.query.id;

    try {
        // Require auth for POST and DELETE
        if (req.method !== 'GET') {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
        }

        // Fetch business and verify access
        let business;
        if (req.method !== 'GET') {
            business = await storage.getBusiness(businessId, req.session.userId);
        } else {
            business = await storage.getBusiness(businessId);
        }

        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }

        if (req.method === 'GET') {
            const { query, maxBudget } = req.query;
            let products;
            if (query !== undefined) {
                const budgetNum = maxBudget ? Number(maxBudget) : null;
                products = await storage.searchProducts(businessId, query, budgetNum);
            } else {
                products = await storage.getProducts(businessId);
            }
            return res.status(200).json({ success: true, products });
        }

        if (req.method === 'POST') {
            const { name, description, price, imageUrl, linkUrl } = req.body;
            if (!name) {
                return res.status(400).json({ success: false, error: 'Product name is required' });
            }

            const newProduct = await storage.addProduct(businessId, {
                name,
                description,
                price: price || 0,
                imageUrl: imageUrl || '',
                linkUrl: linkUrl || ''
            });

            return res.status(201).json({ success: true, product: newProduct });
        }

        if (req.method === 'DELETE') {
            const { productId } = req.body;
            if (!productId) {
                return res.status(400).json({ success: false, error: 'productId is required' });
            }

            const deleted = await storage.deleteProduct(businessId, productId);
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
