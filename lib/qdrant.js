// Qdrant Client Library for AICS

const { QdrantClient } = require('@qdrant/js-client-rest');
const config = require('./config');

class QdrantManager {
    constructor() {
        this.client = null;
    }

    async init() {
        if (this.client) return;

        if (!config.qdrant.url || !config.qdrant.apiKey) {
            return;
        }

        try {
            this.client = new QdrantClient({
                url: config.qdrant.url,
                apiKey: config.qdrant.apiKey
            });
        } catch (error) {
            // Failed to connect to Qdrant
        }
    }

    async initCollection(collectionName) {
        if (!this.client) await this.init();
        if (!this.client) return;

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
        }
    }

    async insertFAQ(question, answer, embedding, collectionName = config.qdrant.collectionName) {
        if (!this.client) await this.init();
        if (!this.client) return;
        
        const crypto = require('crypto');

        return await this.client.upsert(collectionName, {
            points: [
                {
                    id: crypto.randomUUID(),
                    vector: embedding,
                    payload: {
                        type: 'faq',
                        question,
                        answer
                    }
                }
            ]
        });
    }

    async batchInsertFAQs(faqs, embeddings, collectionName = config.qdrant.collectionName) {
        if (!this.client) await this.init();
        if (!this.client) return;
        
        const crypto = require('crypto');

        const points = faqs.map((faq, index) => ({
            id: crypto.randomUUID(),
            vector: embeddings[index],
            payload: {
                type: 'faq',
                ...faq
            }
        }));

        return await this.client.upsert(collectionName, {
            points
        });
    }

    async insertChunks(chunks, embeddings, collectionName, sourceType, sourceName) {
        if (!this.client) await this.init();
        if (!this.client) return;

        const crypto = require('crypto');

        const points = chunks.map((chunk, index) => ({
            id: crypto.randomUUID(),
            vector: embeddings[index],
            payload: {
                type: sourceType, // 'website' or 'pdf'
                source: sourceName,
                content: chunk
            }
        }));

        return await this.client.upsert(collectionName, {
            points
        });
    }

    async searchSimilar(queryEmbedding, limit = 5, collectionName = config.qdrant.collectionName) {
        if (!this.client) await this.init();
        if (!this.client) return [];

        const results = await this.client.search(collectionName, {
            vector: queryEmbedding,
            limit,
            with_payload: true
        });

        return results.map(result => ({
            score: result.score,
            ...result.payload
        }));
    }
}

module.exports = QdrantManager;
