// Vercel API Route: /api/businesses/[id]/pdf
// Handles PDF/DOCX uploads for a specific business

const storage = require('../../../lib/storage');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { trainDocument } = require('../../../lib/training');

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
    }
});

// File filter to accept only PDF and DOCX
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and DOCX files are allowed!'));
    }
};

const upload = multer({
    storage: storageConfig,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Auth check
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check if business exists and user owns it
    const businessId = req.query.id;
    const business = storage.getBusiness(businessId, req.session.userId);
    if (!business) {
        return res.status(404).json({ success: false, error: 'Business not found' });
    }

    // Use multer to handle the upload
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        try {
            const newPdf = storage.addPdf(businessId, req.file.originalname, req.file.filename);

            if (!newPdf) {
                return res.status(404).json({ success: false, error: 'Business not found' });
            }

            // Try to run training (with timeout for serverless)
            try {
                // Update status to training
                const businessRef = storage.getBusiness(businessId);
                const pdfIndex = businessRef.knowledgeSources.pdfs.findIndex(p => p.id === newPdf.id);
                if (pdfIndex !== -1) {
                    businessRef.knowledgeSources.pdfs[pdfIndex].status = 'training';
                    storage.save();
                }

                // Run actual training with timeout (10 seconds for serverless)
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Training timed out')), 10000)
                );
                const filePath = path.join(uploadsDir, req.file.filename);
                const trainingPromise = trainDocument(businessId, filePath, req.file.originalname, businessRef.qdrantCollection);
                const result = await Promise.race([trainingPromise, timeoutPromise]);

                // Update status to completed
                const businessRef2 = storage.getBusiness(businessId);
                const pdfIndex2 = businessRef2.knowledgeSources.pdfs.findIndex(p => p.id === newPdf.id);
                if (pdfIndex2 !== -1) {
                    businessRef2.knowledgeSources.pdfs[pdfIndex2].status = 'completed';
                    businessRef2.knowledgeSources.pdfs[pdfIndex2].lastTrainedAt = new Date().toISOString();
                    businessRef2.knowledgeSources.pdfs[pdfIndex2].chunksCount = result.chunksCount;
                    storage.save();
                }

                console.log('Document training completed:', req.file.originalname);
            } catch (error) {
                console.error('Document training failed:', error);
                // Update status to failed
                const businessRef = storage.getBusiness(businessId);
                const pdfIndex = businessRef.knowledgeSources.pdfs.findIndex(p => p.id === newPdf.id);
                if (pdfIndex !== -1) {
                    businessRef.knowledgeSources.pdfs[pdfIndex].status = 'failed';
                    businessRef.knowledgeSources.pdfs[pdfIndex].error = error.message;
                    storage.save();
                }
            }

            return res.status(201).json({ success: true, pdf: newPdf });

        } catch (error) {
            console.error('Error in PDF API:', error);
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });
};
