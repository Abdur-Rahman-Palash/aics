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

        const systemPrompt = `You are a helpful customer support assistant. Use ONLY the provided context below to answer the user's question.

CRITICAL RULES:
1. Only use information from the provided context. Do NOT make up answers.
2. If you cannot find the answer in the context, politely say "I'm sorry, I don't have information about that. Please ask a human agent for help."
3. Answer in the same language as the user's question (English or Bangla).
4. If the context has the answer, provide it directly and clearly. NO EXTRA INFORMATION. ONLY THE ANSWER FROM PDF, DOCX, TXT, CSV, Excel, TRAIN WEBSITE,FAQ etc.
5. Do NOT mention "FAQ context" or "provided context" in your answer.
6. Do NOT include multiple answers or extra questions/answers from the context.

CONTEXT:
${context}
`;

        const prompt = `${systemPrompt}\n\nUSER QUESTION: ${userMessage}\n\nYOUR ANSWER:`;

        console.log('[GEMINI] Sending prompt:', prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('[GEMINI] Response:', text);
        return text;
    }
}

module.exports = GeminiAI;
