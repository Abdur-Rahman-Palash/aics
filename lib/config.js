// Configuration file for AICS

module.exports = {
    gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-flash-latest',
        embeddingModel: 'gemini-embedding-001'
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
