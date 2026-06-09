const Groq = require('groq-sdk');

class LangChainIntegration {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.model = 'llama-3.1-8b-instant';
  }

  init() { return; }

  async generateResponse(userMessage, context, conversationHistory = []) {
    const messages = [
      {
        role: 'system',
        content: `You are a helpful customer support assistant. Use the following context to answer user questions.

Rules:
1. If unrelated to context, say: "I'm sorry, I can only assist with topics related to our business."
2. Answer in the same language as the user (English or Bangla).

CONTEXT:
${context}`
      }
    ];

    for (const msg of conversationHistory) {
      if (msg.role === 'user') messages.push({ role: 'user', content: msg.content });
      else if (msg.role === 'ai') messages.push({ role: 'assistant', content: msg.content });
    }

    messages.push({ role: 'user', content: userMessage });

    const result = await this.groq.chat.completions.create({
      model: this.model,
      messages: messages,
      max_tokens: 500,
      temperature: 0.3
    });

    return result.choices[0].message.content.trim();
  }
}

module.exports = LangChainIntegration;