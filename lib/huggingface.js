const Groq = require('groq-sdk');
const { HfInference } = require('@huggingface/inference');

class HuggingFaceAI {
    constructor() {
        this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
        this.model = 'llama-3.1-8b-instant';
    }

    async generateEmbedding(text) {
        const result = await this.hf.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: text
        });
        return Array.from(result);
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
                    content: `You are a helpful customer support assistant. Use ONLY the provided context to answer.

RULES:
1. Only use information from the context. Do NOT make up answers.
2. If answer not in context, say exactly: "I'm sorry, but I can only assist with questions related to this website and its services. If you need further assistance, please complete the contact form below."
3. Answer in the same language as the user (English or Bangla).
4. Be direct and clear. NO EXTRA INFORMATION.

CONTEXT:
${context}`
                },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 500,
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
                    content: `Is the user's question related to the business services in the context? Reply ONE word only: RELATED or UNRELATED.

CONTEXT: ${contextChunks.slice(0, 2).join('\n')}`
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