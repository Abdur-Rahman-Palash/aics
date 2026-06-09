// Configuration file for AICS

module.exports = {
    gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-2.0-flash',
        embeddingModel: 'gemini-embedding-001'
    },
    groq: {
        apiKey: process.env.GROQ_API_KEY || '',
        model: 'llama-3.1-8b-instant'
    },
    huggingface: {
        apiKey: process.env.HUGGINGFACE_API_KEY || '',
        embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2'
    },
    qdrant: {
        url: process.env.QDRANT_URL || '',
        apiKey: process.env.QDRANT_API_KEY || '',
        collectionName: 'aics_faqs'
    },
    app: {
        name: 'AICS - AI Customer Support'
    }
};
