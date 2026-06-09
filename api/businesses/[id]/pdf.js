// Vercel API Route: /api/businesses/[id]/pdf
// Handles PDF/DOCX uploads for a specific business

const getStorage = require('../../../lib/storage');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieSession = require('cookie-session');
const { trainDocument } = require('../../../lib/training');
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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

// File filter to accept PDF, DOCX, TXT, CSV, Excel files
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt', '.csv', '.xlsx', '.xls', '.xml', '.json', '.md', '.rtf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, DOCX, TXT, CSV, Excel, XML, JSON, Markdown, RTF files are allowed!'));
    }
};

const upload = multer({
    storage: storageConfig,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
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

    // Check authentication for non-GET requests
    if (req.method !== 'OPTIONS') {
        if (!req.session || !req.session.userId) {
            console.error('[PDF] Unauthorized: no session userId');
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
    }

    // Check if business exists
    const businessId = req.query.id;
    console.log('[PDF] businessId:', businessId);
    const business = await storage.getBusiness(businessId, req.session.userId);
    if (!business) {
        console.error('[PDF] Business not found');
        return res.status(404).json({ success: false, error: 'Business not found' });
    }
    console.log('[PDF] Business found:', business.name);

    if (req.method === 'DELETE') {
        try {
            const { pdfId } = req.body;
            if (!pdfId) {
                return res.status(400).json({ success: false, error: 'pdfId is required' });
            }
            
            const deleted = await storage.deletePdf(businessId, pdfId);
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'PDF not found' });
            }
            
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('[PDF] Delete error:', error);
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Use multer to handle the upload
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('[PDF] Multer error:', err);
            return res.status(400).json({ success: false, error: err.message });
        }

        if (!req.file) {
            console.error('[PDF] No file uploaded');
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        console.log('[PDF] File uploaded:', req.file.originalname);

        try {
            const newPdf = await storage.addPdf(businessId, req.file.originalname, req.file.filename);
            console.log('[PDF] New PDF added:', newPdf.id);

            if (!newPdf) {
                return res.status(404).json({ success: false, error: 'Business not found' });
            }

            // Try to run training (with timeout for serverless)
            try {
                console.log('[PDF] Starting training for', req.file.originalname);
                console.log('[PDF] Environment check:', {
                    hasHfKey: !!process.env.HUGGINGFACE_API_KEY,
                    hasQdrant: !!process.env.QDRANT_URL,
                    nodeEnv: process.env.NODE_ENV
                });
                
                // Run actual training - increase timeout to 120 seconds for Render!
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Training timed out after 120 seconds')), 120000)
                );
                const filePath = path.join(uploadsDir, req.file.filename);
                console.log('[PDF] Calling trainDocument on filePath:', filePath);
                const trainingPromise = trainDocument(businessId, filePath, req.file.originalname, business.qdrantCollection);
                const result = await Promise.race([trainingPromise, timeoutPromise]);
                console.log('[PDF] Training complete:', result);

                // Update status to completed via storage helper
                await storage.updateKnowledgeSourceStatus(businessId, newPdf.id, 'completed', {
                    lastTrainedAt: new Date().toISOString(),
                    chunksCount: result.chunksCount
                });

            } catch (error) {
                console.error('[PDF] Training failed:', {
                    error: error.message,
                    stack: error.stack,
                    businessId,
                    fileName: req.file.originalname,
                    hasHfKey: !!process.env.HUGGINGFACE_API_KEY
                });
                // Update status to failed via storage helper
                await storage.updateKnowledgeSourceStatus(businessId, newPdf.id, 'failed', {
                    error: error.message
                });
            }

            return res.status(201).json({ success: true, pdf: newPdf });

        } catch (error) {
            console.error('[PDF] Internal error:', error);
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });
};
