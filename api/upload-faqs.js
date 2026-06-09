// Vercel API Route: /api/upload-faqs
// Uploads and embeds FAQs into Qdrant

const QdrantManager = require('../lib/qdrant');
const HuggingFaceAI = require('../lib/huggingface');

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

    try {
        const { faqs } = req.body;

        if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
            return res.status(400).json({ error: 'FAQs array is required' });
        }

        // Validate FAQ format
        for (const faq of faqs) {
            if (!faq.question || !faq.answer) {
                return res.status(400).json({ 
                    error: 'Each FAQ must have question and answer fields' 
                });
            }
        }

        // Initialize services
        const qdrant = new QdrantManager();
        const gemini = new HuggingFaceAI();

        // Generate embeddings for all FAQs
        const texts = faqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`);
        const embeddings = await gemini.batchGenerateEmbeddings(texts);

        // Insert into Qdrant
        await qdrant.batchInsertFAQs(faqs, embeddings);

        return res.status(200).json({
            success: true,
            message: `Successfully uploaded ${faqs.length} FAQs`
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
