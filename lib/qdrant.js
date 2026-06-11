// PostgreSQL Vector Storage for AICS
// Replaces file-based storage — data persists across Render deploys!

const { Pool } = require('pg');
const config = require('./config');

// Reuse the same DB connection string your app already uses
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

class LocalVectorStorage {
    constructor() {
        this._initialized = false;
    }

    // Cosine similarity in JS (used as fallback / for reference)
    cosineSimilarity(vecA, vecB) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot   += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0) return 0;
        return dot / (normA * normB);
    }

    // Create table once — safe to call multiple times
    async init() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vector_embeddings (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                collection  TEXT NOT NULL,
                vector      JSONB NOT NULL,
                payload     JSONB NOT NULL,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        // Index for fast collection filtering
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_vector_embeddings_collection
            ON vector_embeddings (collection)
        `);
        this._initialized = true;
        console.log('PostgreSQL Vector Storage initialized!');
    }

    async initCollection(collectionName) {
        if (!this._initialized) await this.init();
        console.log('Collection ready (PostgreSQL):', collectionName);
    }

    // ── Insert helpers ────────────────────────────────────────────────────────

    async insertFAQ(question, answer, embedding, collectionName = config.qdrant.collectionName) {
        if (!this._initialized) await this.init();
        await pool.query(
            `INSERT INTO vector_embeddings (collection, vector, payload)
             VALUES ($1, $2::jsonb, $3::jsonb)`,
            [
                collectionName,
                JSON.stringify(embedding),
                JSON.stringify({ type: 'faq', question, answer })
            ]
        );
        return { success: true };
    }

    async batchInsertFAQs(faqs, embeddings, collectionName = config.qdrant.collectionName) {
        if (!this._initialized) await this.init();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (let i = 0; i < faqs.length; i++) {
                await client.query(
                    `INSERT INTO vector_embeddings (collection, vector, payload)
                     VALUES ($1, $2::jsonb, $3::jsonb)`,
                    [
                        collectionName,
                        JSON.stringify(embeddings[i]),
                        JSON.stringify({ type: 'faq', ...faqs[i] })
                    ]
                );
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        return { success: true };
    }

    async insertChunks(chunks, embeddings, collectionName, sourceType, sourceName) {
        console.log(`insertChunks: ${chunks.length} chunks → ${collectionName}`);
        if (!this._initialized) await this.init();

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (let i = 0; i < chunks.length; i++) {
                await client.query(
                    `INSERT INTO vector_embeddings (collection, vector, payload)
                     VALUES ($1, $2::jsonb, $3::jsonb)`,
                    [
                        collectionName,
                        JSON.stringify(embeddings[i]),
                        JSON.stringify({ type: sourceType, source: sourceName, content: chunks[i] })
                    ]
                );
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        console.log('insertChunks complete:', chunks.length, 'rows saved to PostgreSQL');
        return { operation_id: Date.now(), status: 'completed' };
    }

    // ── Search ────────────────────────────────────────────────────────────────

    async searchSimilar(queryEmbedding, limit = 5, collectionName = config.qdrant.collectionName) {
        if (!this._initialized) await this.init();

        // Pull all vectors for this collection, score in JS
        // (Fast enough for typical knowledge bases up to ~50k chunks)
        const { rows } = await pool.query(
            `SELECT payload, vector FROM vector_embeddings WHERE collection = $1`,
            [collectionName]
        );

        if (rows.length === 0) return [];

        const scored = rows.map(row => {
            const vec = Array.isArray(row.vector) ? row.vector : Object.values(row.vector);
            return {
                score: this.cosineSimilarity(queryEmbedding, vec),
                ...row.payload
            };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit);
    }

    // ── Utility: delete all chunks for a specific source ─────────────────────
    // Useful if you want to re-train a single PDF/website without duplicates

    async deleteBySource(collectionName, sourceName) {
        if (!this._initialized) await this.init();
        const result = await pool.query(
            `DELETE FROM vector_embeddings
             WHERE collection = $1
               AND payload->>'source' = $2`,
            [collectionName, sourceName]
        );
        console.log(`Deleted ${result.rowCount} rows for source: ${sourceName}`);
        return result.rowCount;
    }

    async deleteCollection(collectionName) {
        if (!this._initialized) await this.init();
        const result = await pool.query(
            `DELETE FROM vector_embeddings WHERE collection = $1`,
            [collectionName]
        );
        console.log(`Deleted ${result.rowCount} rows for collection: ${collectionName}`);
        return result.rowCount;
    }
}

module.exports = LocalVectorStorage;
