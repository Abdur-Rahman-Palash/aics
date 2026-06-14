const Groq = require('groq-sdk');

const tools = [
  {
    type: 'function',
    function: {
      name: 'searchProducts',
      description: 'Search for products, tours, or items in the website catalog.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keywords or tour destination' },
          maxBudget: { type: 'number', description: 'Maximum price or budget constraint (optional)' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'bookAppointment',
      description: 'Book a tour, reservation, meeting, or appointment.',
      parameters: {
        type: 'object',
        properties: {
          dateTime: { type: 'string', description: 'Date and time for the booking (e.g. ISO string or natural language)' },
          name: { type: 'string', description: 'Name of the booking / item' },
          notes: { type: 'string', description: 'Special instructions or notes' }
        },
        required: ['dateTime']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fillForm',
      description: 'Help fill out form fields on the website (e.g. contact form, checkout form).',
      parameters: {
        type: 'object',
        properties: {
          formId: { type: 'string', description: 'CSS selector or ID of the form' },
          data: { 
            type: 'object', 
            description: 'Key-value pairs of form inputs to fill',
            additionalProperties: { type: 'string' }
          }
        },
        required: ['data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'trackOrder',
      description: 'Track the status of an order using an order ID.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The unique order tracking number' }
        },
        required: ['orderId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showBookingForm',
      description: 'Display an interactive booking details form with a date/time picker directly inside the chat feed to help the user book an appointment, meeting, or reservation.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showContactForm',
      description: 'Display a contact details form (asking for Name, Email, Phone, and Message) directly inside the chat feed.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showFeedbackForm',
      description: 'Display an interactive customer satisfaction rating & feedback survey form directly inside the chat feed.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

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
        content: `You are a helpful customer support assistant. Use the provided context to answer questions directly and clearly.
You can also interact directly with the website by calling ONLY these specific tools: searchProducts, bookAppointment, fillForm, trackOrder, showBookingForm, showContactForm, showFeedbackForm.

RULES:
1. FIRST try to find the answer in the provided CONTEXT and use that to answer the user's question.
2. ONLY call a tool if the user asks for an action that directly matches one of the available tools.
3. If an answer is found in the context, DO NOT call any tools — just answer the question directly.
4. Answer in the SAME LANGUAGE as the user's message (if user writes in Bengali, answer in Bengali; if in English, answer in English).
5. Keep your answers clear, concise, and helpful.
6. NEVER repeat the same phrase over and over.
7. NEVER call tools that are not listed above.

CONTEXT:
${context}`
      }
    ];

    for (const msg of conversationHistory) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'ai' || msg.role === 'assistant') {
        const assistantMsg = { role: 'assistant', content: msg.content || '' };
        if (msg.toolCalls) {
          assistantMsg.tool_calls = msg.toolCalls;
        }
        messages.push(assistantMsg);
      } else if (msg.role === 'tool') {
        messages.push({
          role: 'tool',
          tool_call_id: msg.toolCallId,
          name: msg.name,
          content: msg.content
        });
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    const result = await this.groq.chat.completions.create({
      model: this.model,
      messages: messages,
      max_tokens: 800,
      temperature: 0.3,
      tools: tools
    });

    const choiceMessage = result.choices[0].message;
    if (choiceMessage.tool_calls && choiceMessage.tool_calls.length > 0) {
      return {
        isToolCall: true,
        toolCalls: choiceMessage.tool_calls,
        content: choiceMessage.content || ''
      };
    }

    return {
      isToolCall: false,
      content: choiceMessage.content ? choiceMessage.content.trim() : ''
    };
  }
}

module.exports = LangChainIntegration;