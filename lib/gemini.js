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
2. If you cannot find the answer in the context, politely say "I'm sorry, I don't have information about that. Please ask a human agent for help and show a lead form to the user."
3. Answer in the same language as the user's question (English or Bangla).
4. If the context has the answer, provide it directly and clearly. NO EXTRA INFORMATION.
5. Do NOT mention "FAQ context" or "provided context" in your answer.
6. Do NOT include multiple answers or extra questions/answers from the context.
7. For task-based questions like "I want to create an invoice", find the relevant steps in the context and provide them clearly.

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

  async generateUnrelatedResponse(userQuestion) {
    this.init();

    const model = this.genAI.getGenerativeModel({
      model: config.gemini.model
    });

    const systemPrompt = `You are a helpful customer support assistant. The user's question is not related to our website/services.

Instructions:
1. Politely inform the user that you don't have information about that topic
2. Suggest where they might find the answer (e.g., Google search, specific websites if applicable)
3. Answer in the same language as the user's question (English or Bangla)
4. Keep it friendly and helpful`;

    const prompt = `${systemPrompt}\n\nUSER QUESTION: ${userQuestion}\n\nYOUR ANSWER:`;

    console.log('[GEMINI] Generating unrelated question response...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('[GEMINI] Unrelated response:', text);
    return text;
  }

  async classifyQuestionRelevance(userQuestion, contextChunks) {
    this.init();

    const model = this.genAI.getGenerativeModel({
      model: config.gemini.model
    });

    // If there are no context chunks at all, default to RELATED (since the user is on the website, their question is probably about the business!)
    if (contextChunks.length === 0) {
      console.log('[GEMINI] No context chunks available, defaulting to RELATED (user is on business website)');
      return true;
    }

    const systemPrompt = `Your sole job is to determine if the user's question is related to the business's services or website purpose.

RULES:
- Answer ONLY with one word: RELATED or UNRELATED
- If the question is about tasks that the business/website does, answer RELATED - even if you don't see the exact steps in the context
- If the question is about the business's own products or services, answer RELATED
- Only answer UNRELATED if the question is completely off-topic (sports scores, weather, general knowledge not about the business, etc.)

CONTEXT FROM WEBSITE:
${contextChunks.join('\n\n---\n\n')}
`;

    const prompt = `${systemPrompt}\n\nUSER QUESTION: ${userQuestion}\n\nANSWER (ONE WORD ONLY):`;

    console.log('[GEMINI] Classifying question relevance...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim().toUpperCase();
    console.log('[GEMINI] Classification result:', text);
    return text.includes('RELATED');
  }
}

module.exports = GeminiAI;
