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
        content: `You are a helpful customer support assistant. Use ONLY the provided context to answer.

RULES:
1. Only use information from the context. Do NOT make up answers.
2. If answer not in context, say exactly: "I'm sorry, but I can only assist with questions related to this website and its services. If you need further assistance, please complete the contact form below."
3. Answer in the SAME LANGUAGE as the user's message (English, Bengali, Hindi, Urdu,Arabic, Spanish,French, German, Portuguese, Chinese (Simplified),Japanese,Korean,Russian,Turkish and Indonesian ). This is REQUIRED.
4. Organize your answer with bullet points or numbered lists whenever possible for readability. Use line breaks between sections.
5. Be direct and clear. NO extra information.

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
      max_tokens: 800,
      temperature: 0.3
    });

    return result.choices[0].message.content.trim();
  }
}

module.exports = LangChainIntegration;