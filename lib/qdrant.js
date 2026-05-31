// Qdrant Client Library for AICS

const { QdrantClient } = require('@qdrant/js-client-rest');
const config = require('./config');

class QdrantManager {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        if (!config.qdrant.url || !config.qdrant.apiKey) {
            throw new Error('Qdrant configuration missing. Please set QDRANT_URL and QDRANT_API_KEY in environment variables.');
        }

        this.client = new QdrantClient({
            url: config.qdrant.url,
            apiKey: config.qdrant.apiKey
        });

        await this.ensureCollection();
        this.initialized = true;
    }

    async ensureCollection() {
        const collectionName = config.qdrant.collectionName;

        try {
            // Check if collection exists
            await this.client.getCollection(collectionName);
        } catch (error) {
            // Create collection if it doesn't exist
            await this.client.createCollection(collectionName, {
                vectors: {
                    size: 3072, // Gemini embedding dimension (gemini-embedding-001)
                    distance: 'Cosine'
                }
            });
            console.log(`Collection '${collectionName}' created successfully.`);
        }
    }

    async insertFAQ(question, answer, embedding) {
        await this.init();
        const crypto = require('crypto');

        return await this.client.upsert(config.qdrant.collectionName, {
            points: [
                {
                    id: crypto.randomUUID(),
                    vector: embedding,
                    payload: {
                        question,
                        answer
                    }
                }
            ]
        });
    }

    async batchInsertFAQs(faqs, embeddings) {
        await this.init();
        const crypto = require('crypto');

        const points = faqs.map((faq, index) => ({
            id: crypto.randomUUID(),
            vector: embeddings[index],
            payload: faq
        }));

        return await this.client.upsert(config.qdrant.collectionName, {
            points
        });
    }

    async searchSimilar(queryEmbedding, limit = 5) {
        await this.init();

        const results = await this.client.search(config.qdrant.collectionName, {
            vector: queryEmbedding,
            limit,
            with_payload: true
        });

        return results.map(result => ({
            score: result.score,
            question: result.payload.question,
            answer: result.payload.answer
        }));
    }
}

module.exports = QdrantManager;
