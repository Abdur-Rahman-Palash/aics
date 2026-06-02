// Gemini AI Library for AICS

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');

class GeminiAI {
    constructor() {
        this.genAI = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        if (!config.gemini.apiKey) {
            throw new Error('Gemini API key missing. Please set GEMINI_API_KEY in environment variables.');
        }

        this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        this.initialized = true;
    }

    async generateEmbedding(text) {
        this.init();

        const model = this.genAI.getGenerativeModel({
            model: config.gemini.embeddingModel
        });

        const result = await model.embedContent(text);
        return result.embedding.values;
    }

    async batchGenerateEmbeddings(texts) {
        this.init();

        const embeddings = [];
        const model = this.genAI.getGenerativeModel({
            model: config.gemini.embeddingModel
        });

        for (const text of texts) {
            const result = await model.embedContent(text);
            embeddings.push(result.embedding.values);
        }

        return embeddings;
    }

    async generateResponse(userMessage, context) {
        this.init();

        const model = this.genAI.getGenerativeModel({
            model: config.gemini.model
        });

        const systemPrompt = `You are a helpful customer support assistant. Use the following FAQ context to answer user questions.

Rules:
1. If the question is completely unrelated to the FAQ context or the business's products/services, respond exactly with: "I'm sorry, I can only assist with topics related to our business. Please talk to a human agent for other questions."
2. If you don't know the answer from the context, politely ask them to clarify or offer to escalate to human support.
3. Answer in the same language as the user's question (English or Bangla).

FAQ Context:
${context}
`;

        const prompt = `${systemPrompt}\n\nUser: ${userMessage}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
}

module.exports = GeminiAI;
