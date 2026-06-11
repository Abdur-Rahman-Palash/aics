const Groq = require('groq-sdk');
const { HfInference } = require('@huggingface/inference');

class HuggingFaceAI {
    constructor() {
        this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
        this.model = 'llama-3.1-8b-instant';
        this.embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
    }

    async generateEmbedding(text, retries = 3, delayMs = 3000) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`Embedding attempt ${attempt}/${retries} for text length ${text.length}`);
                const result = await this.hf.featureExtraction({
                    model: this.embeddingModel,
                    inputs: text,
                });

                // HF inference v3+ returns nested arrays for sentence-transformers
                // Shape can be [embedding] (2D) or embedding (1D) - flatten to 1D
                let embedding;
                if (Array.isArray(result[0])) {
                    // 2D: [[0.1, 0.2, ...]] -> [0.1, 0.2, ...]
                    embedding = result[0];
                } else {
                    // 1D: [0.1, 0.2, ...]
                    embedding = Array.from(result);
                }

                if (!embedding || embedding.length === 0) {
                    throw new Error('Empty embedding returned from HuggingFace');
                }

                console.log(`Embedding generated, dimensions: ${embedding.length}`);
                return embedding;
            } catch (error) {
                const isLastAttempt = attempt === retries;
                const isHttpError = error.message && (
                    error.message.includes('HTTP') ||
                    error.message.includes('503') ||
                    error.message.includes('502') ||
                    error.message.includes('loading') ||
                    error.message.includes('provider')
                );

                console.error(`Embedding attempt ${attempt} failed:`, error.message);

                if (isLastAttempt) {
                    throw new Error(`Failed to generate embedding after ${retries} attempts: ${error.message}`);
                }

                if (isHttpError) {
                    // Model may be loading (HF free tier cold start) - wait longer
                    const waitTime = delayMs * attempt;
                    console.log(`Model may be loading. Waiting ${waitTime}ms before retry...`);
                    await new Promise(res => setTimeout(res, waitTime));
                } else {
                    // Non-HTTP error - shorter wait
                    await new Promise(res => setTimeout(res, 1000));
                }
            }
        }
    }

    async batchGenerateEmbeddings(texts) {
        const embeddings = [];
        for (const text of texts) {
            const emb = await this.generateEmbedding(text);
            embeddings.push(emb);
        }
        return embeddings;
    }

    async generateResponse(userMessage, context) {
        const result = await this.groq.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: `You are a helpful customer support assistant. Use ONLY the provided context to answer.\n\nRULES:\n1. Only use information from the context. Do NOT make up answers.\n2. If answer not in context, say exactly: "I'm sorry, but I can only assist with questions related to this website and its services. If you need further assistance, please complete the contact form below."\n3. Answer in the SAME LANGUAGE as the user's message (English, Bengali, Hindi, Urdu, Arabic, Spanish, French, German, Portuguese, Chinese (Simplified), Japanese, Korean, Russian, Turkish, and Indonesian). This is REQUIRED.\n4. Organize your answer with bullet points or numbered lists whenever possible for readability. Use line breaks between sections.\n5. Be direct and clear. NO extra information.\n\nCONTEXT:\n${context}`
                },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 800,
            temperature: 0.3
        });

        return result.choices[0].message.content.trim();
    }

    async classifyQuestionRelevance(userQuestion, contextChunks) {
        if (contextChunks.length === 0) return true;

        const result = await this.groq.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: `Is the user's question related to the business services in the context? Reply ONE word only: RELATED or UNRELATED.\n\nCONTEXT: ${contextChunks.slice(0, 2).join('\n')}`
                },
                { role: 'user', content: userQuestion }
            ],
            max_tokens: 5,
            temperature: 0.1
        });

        return result.choices[0].message.content.trim().toUpperCase().includes('RELATED');
    }

    async generateUnrelatedResponse() {
        return "I'm sorry, but I can only assist with questions related to this website and its services. If you need further assistance, please complete the contact form below.";
    }
}

module.exports = HuggingFaceAI;