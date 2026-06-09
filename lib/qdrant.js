// Local Vector Storage for AICS (No more Qdrant cloud issues!)

const fs = require('fs');
const path = require('path');
const config = require('./config');

class LocalVectorStorage {
    constructor() {
        this.dataDir = path.join(__dirname, '../data/embeddings');
        // Ensure embeddings directory exists
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        this.collections = {}; // Loaded collections in memory
    }

    // Helper: Get file path for a collection
    getCollectionPath(collectionName) {
        return path.join(this.dataDir, `${collectionName}.json`);
    }

    // Load collection from disk (or create new if doesn't exist) - cached!
    loadCollection(collectionName, forceReload = false) {
        // If already loaded and not forcing a reload, return cached version
        if (this.collections[collectionName] && !forceReload) {
            return this.collections[collectionName];
        }
        
        const filePath = this.getCollectionPath(collectionName);
        if (fs.existsSync(filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.collections[collectionName] = data;
            } catch (error) {
                console.error('Failed to load collection:', error);
                this.collections[collectionName] = [];
            }
        } else {
            this.collections[collectionName] = [];
        }
        return this.collections[collectionName];
    }

    // Save collection to disk
    saveCollection(collectionName) {
        const filePath = this.getCollectionPath(collectionName);
        const data = this.collections[collectionName] || [];
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // Cosine similarity calculation (local)
    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (normA * normB);
    }

    // Initialize (compatible with original QdrantManager)
    async init() {
        console.log('Local Vector Storage initialized!');
    }

    // Initialize collection
    async initCollection(collectionName) {
        console.log('initCollection called for:', collectionName);
        this.loadCollection(collectionName);
        console.log('Collection', collectionName, 'ready!');
    }

    // Insert FAQ
    async insertFAQ(question, answer, embedding, collectionName = config.qdrant.collectionName) {
        const crypto = require('crypto');
        const collection = this.loadCollection(collectionName, true); // Force reload latest
        collection.push({
            id: crypto.randomUUID(),
            vector: embedding,
            payload: {
                type: 'faq',
                question,
                answer
            }
        });
        this.saveCollection(collectionName);
        // Make sure our in-memory cache is up to date!
        this.collections[collectionName] = collection;
        return { success: true };
    }

    // Batch insert FAQs
    async batchInsertFAQs(faqs, embeddings, collectionName = config.qdrant.collectionName) {
        const crypto = require('crypto');
        const collection = this.loadCollection(collectionName, true); // Force reload latest
        const points = faqs.map((faq, index) => ({
            id: crypto.randomUUID(),
            vector: embeddings[index],
            payload: {
                type: 'faq',
                ...faq
            }
        }));
        collection.push(...points);
        this.saveCollection(collectionName);
        // Make sure our in-memory cache is up to date!
        this.collections[collectionName] = collection;
        return { success: true };
    }

    // Insert chunks (for PDF/website training)
    async insertChunks(chunks, embeddings, collectionName, sourceType, sourceName) {
        console.log('insertChunks called for', chunks.length, 'chunks into', collectionName);
        const crypto = require('crypto');
        const collection = this.loadCollection(collectionName, true); // Force reload latest
        const points = chunks.map((chunk, index) => ({
            id: crypto.randomUUID(),
            vector: embeddings[index],
            payload: {
                type: sourceType,
                source: sourceName,
                content: chunk
            }
        }));
        collection.push(...points);
        this.saveCollection(collectionName);
        // Make sure our in-memory cache is up to date!
        this.collections[collectionName] = collection;
        console.log('Upsert complete:', { operation_id: Date.now(), status: 'completed' });
        return { operation_id: Date.now(), status: 'completed' };
    }

    // Search similar items
    async searchSimilar(queryEmbedding, limit = 5, collectionName = config.qdrant.collectionName) {
        const collection = this.loadCollection(collectionName);
        const results = collection.map(item => ({
            score: this.cosineSimilarity(queryEmbedding, item.vector),
            ...item.payload
        }));
        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        // Take top 'limit'
        return results.slice(0, limit);
    }
}

module.exports = LocalVectorStorage;
