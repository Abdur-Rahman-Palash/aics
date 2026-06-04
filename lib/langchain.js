// LangChain Integration for AICS
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const {
  ChatPromptTemplate,
  HumanMessage,
  AIMessage,
} = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');
const config = require('./config');

class LangChainIntegration {
  constructor() {
    this.llm = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    if (!config.gemini.apiKey) {
      throw new Error('Gemini API key missing. Please set GEMINI_API_KEY in environment variables.');
    }

    // Initialize Gemini LLM via LangChain
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: config.gemini.apiKey,
      model: config.gemini.model,
    });

    this.initialized = true;
  }

  async generateResponse(userMessage, context, conversationHistory = []) {
    this.init();

    // Create messages array
    const messages = [
      [
        'system',
        `You are a helpful customer support assistant. Use the following FAQ context to answer user questions.

Rules:
1. If the question is completely unrelated to the FAQ context or the business's products/services, respond exactly with: "I'm sorry, I can only assist with topics related to our business. Please talk to a human agent for other questions."
2. If you don't know the answer from the context, politely ask them to clarify or offer to escalate to human support.
3. Answer in the same language as the user's question (English or Bangla).

FAQ Context:
${context}`,
      ],
    ];

    // Add conversation history
    for (const msg of conversationHistory) {
      if (msg.role === 'user') {
        messages.push(['human', msg.content]);
      } else if (msg.role === 'ai') {
        messages.push(['ai', msg.content]);
      }
    }

    messages.push(['human', userMessage]);

    // Create and execute chain
    const prompt = ChatPromptTemplate.fromMessages(messages);

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

    const response = await chain.invoke({});

    return response;
  }
}

module.exports = LangChainIntegration;
