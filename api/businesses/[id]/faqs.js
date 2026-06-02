// Vercel API Route: /api/businesses/[id]/faqs
// Manages FAQs for a specific business

const storage = require('../../../lib/storage');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const businessId = req.query.id;
        
        // Require auth for POST/PUT/DELETE
        if (req.method !== 'GET') {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
        }
        
        // Get business and verify ownership if modifying
        let business;
        if (req.method !== 'GET') {
            business = storage.getBusiness(businessId, req.session.userId);
        } else {
            business = storage.getBusiness(businessId);
        }
        
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }

        if (req.method === 'GET') {
            // Get all FAQs for the business
            return res.status(200).json({
                success: true,
                faqs: business.faqs,
                suggestedFaqs: business.faqs.filter(f => f.isSuggested)
            });
        }

        if (req.method === 'POST') {
            // Add new FAQ
            const { questionEn, questionBn, answerEn, answerBn, isSuggested = false } = req.body;
            
            if (!questionEn || !answerEn) {
                return res.status(400).json({ success: false, error: 'English question and answer are required' });
            }

            const newFAQ = storage.addFAQ(businessId, {
                questionEn,
                questionBn,
                answerEn,
                answerBn,
                isSuggested
            });

            return res.status(201).json({ success: true, faq: newFAQ });
        }

        if (req.method === 'PUT') {
            // Update existing FAQ
            const { faqId, ...updates } = req.body;
            const updatedFAQ = storage.updateFAQ(businessId, faqId, updates);
            
            if (!updatedFAQ) {
                return res.status(404).json({ success: false, error: 'FAQ not found' });
            }

            return res.status(200).json({ success: true, faq: updatedFAQ });
        }

        if (req.method === 'DELETE') {
            // Delete FAQ
            const { faqId } = req.body;
            const deleted = storage.deleteFAQ(businessId, faqId);
            
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'FAQ not found' });
            }

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
