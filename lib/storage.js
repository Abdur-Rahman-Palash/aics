const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Helper function to sanitize strings by removing null characters and other control characters
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  // Remove null characters and other control characters except newlines and tabs
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = sanitizeObject(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// Abstract base storage class
class BaseStorage {
  // Users
  async getUser(email) { throw new Error('Not implemented'); }
  async createUser(email, password, name) { throw new Error('Not implemented'); }
  async loginUser(email, password) { throw new Error('Not implemented'); }
  async getUserById(id) { throw new Error('Not implemented'); }
  
  // Businesses
  async getBusinessesForUser(userId) { throw new Error('Not implemented'); }
  async getBusiness(businessId, userId = null) { throw new Error('Not implemented'); }
  async createBusiness(name, domain, userId) { throw new Error('Not implemented'); }
  async updateBusiness(businessId, updates) { throw new Error('Not implemented'); }
  async deleteBusiness(businessId, userId) { throw new Error('Not implemented'); }
  async updateWidgetSettings(businessId, settings) { throw new Error('Not implemented'); }
  async updateVerification(businessId, verificationData) { throw new Error('Not implemented'); }
  async updateNotificationEmail(businessId, notificationEmail) { throw new Error('Not implemented'); }
  
  // FAQs
  async getFAQsForBusiness(businessId) { throw new Error('Not implemented'); }
  async addFAQ(businessId, faqData) { throw new Error('Not implemented'); }
  async updateFAQ(businessId, faqId, updates) { throw new Error('Not implemented'); }
  async deleteFAQ(businessId, faqId) { throw new Error('Not implemented'); }
  
  // Leads
  async getLeadsForBusiness(businessId) { throw new Error('Not implemented'); }
  async addLead(businessId, leadData) { throw new Error('Not implemented'); }
  async updateLeadStatus(businessId, leadId, status) { throw new Error('Not implemented'); }
  async updateLead(businessId, leadId, updates) { throw new Error('Not implemented'); }
  
  // Knowledge sources
  async addWebsite(businessId, url) { throw new Error('Not implemented'); }
  async addPdf(businessId, originalName, filename) { throw new Error('Not implemented'); }
  async deleteWebsite(businessId, websiteId) { throw new Error('Not implemented'); }
  async deletePdf(businessId, pdfId) { throw new Error('Not implemented'); }
  async getKnowledgeSourcesForBusiness(businessId) { throw new Error('Not implemented'); }
  async updateKnowledgeSourceStatus(businessId, sourceId, status, opts = {}) { throw new Error('Not implemented'); }
  
  // Google Sheets
  async updateGoogleSheets(businessId, updates) { throw new Error('Not implemented'); }
  
  // Conversations
  async getConversationsForBusiness(businessId) { throw new Error('Not implemented'); }
  async getConversation(businessId, conversationId) { throw new Error('Not implemented'); }
  async createConversation(businessId, visitor) { throw new Error('Not implemented'); }
  async updateConversation(businessId, conversationId, updates) { throw new Error('Not implemented'); }
  async addMessageToConversation(businessId, conversationId, message) { throw new Error('Not implemented'); }
  
  // Unanswered questions
  async getUnansweredQuestions(businessId) { throw new Error('Not implemented'); }
  async addUnansweredQuestion(businessId, question) { throw new Error('Not implemented'); }
  async markQuestionAnswered(businessId, questionId) { throw new Error('Not implemented'); }
  
  // Webhooks
  async getWebhooks(businessId) { throw new Error('Not implemented'); }
  async addWebhook(businessId, webhookData) { throw new Error('Not implemented'); }
  async updateWebhook(businessId, webhookId, updates) { throw new Error('Not implemented'); }
  async deleteWebhook(businessId, webhookId) { throw new Error('Not implemented'); }
  
  // Analytics
  async recordAnalytics(businessId, data) { throw new Error('Not implemented'); }
  async getAnalytics(businessId) { throw new Error('Not implemented'); }
  
  // Canned Responses
    async getCannedResponses(businessId) { throw new Error('Not implemented'); }
    async addCannedResponse(businessId, responseData) { throw new Error('Not implemented'); }
    async updateCannedResponse(businessId, responseId, updates) { throw new Error('Not implemented'); }
    async deleteCannedResponse(businessId, responseId) { throw new Error('Not implemented'); }

    // Conversation Tags
    async addConversationTag(businessId, conversationId, tag) { throw new Error('Not implemented'); }
    async removeConversationTag(businessId, conversationId, tag) { throw new Error('Not implemented'); }

    // Conversation Assignment
    async assignConversation(businessId, conversationId, assignee) { throw new Error('Not implemented'); }

    // Proactive Chat Triggers
    async getTriggers(businessId) { throw new Error('Not implemented'); }
    async addTrigger(businessId, triggerData) { throw new Error('Not implemented'); }
    async updateTrigger(businessId, triggerId, updates) { throw new Error('Not implemented'); }
    async deleteTrigger(businessId, triggerId) { throw new Error('Not implemented'); }

    // Conversation Notes
    async addConversationNote(businessId, conversationId, noteData) { throw new Error('Not implemented'); }
    async getConversationNotes(businessId, conversationId) { throw new Error('Not implemented'); }
    async deleteConversationNote(businessId, conversationId, noteId) { throw new Error('Not implemented'); }
}

// Original JSON file storage (kept for backward compatibility)
class JSONStorage extends BaseStorage {
  constructor() {
    super();
    // Use data/db.json (actual data file) instead of data.json
    this.filePath = path.join(__dirname, '../data/db.json');
    this.data = this.load();
  }

  // Load data from JSON file
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    return {
      users: [],
      businesses: []
    };
  }

  // Save the data to the JSON file
  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  // Users methods
  async getUser(email) {
    return this.data.users.find(user => user.email === email) || null;
  }

  async createUser(email, password, name) {
    // Check if user already exists
    const existingUser = await this.getUser(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
      id: require('crypto').randomBytes(16).toString('hex'),
      email,
      password: hashedPassword,
      name,
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  async loginUser(email, password) {
    const user = await this.getUser(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Return user without password
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async getUserById(id) {
    const user = this.data.users.find(user => user.id === id);
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  // Businesses methods
  async getBusinessesForUser(userId) {
    return this.data.businesses.filter(business => business.userId === userId);
  }

  async getBusiness(businessId, userId = null) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    if (userId && business.userId !== userId) return null;
    return business;
  }

  async createBusiness(name, domain, userId) {
    if (!userId) {
      throw new Error('Invalid user session');
    }

    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('Invalid user session');
    }

    const id = require('crypto').randomBytes(16).toString('hex');
    const qdrantCollection = `aics_business_${id}`;
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    
    const business = {
      id,
      name,
      domain,
      userId,
      qdrantCollection,
      faqs: [],
      leads: [],
      knowledgeSources: {
        websites: [],
        pdfs: []
      },
      verification: {
        status: 'pending',
        token: verificationToken
      },
      widgetSettings: {
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        botName: 'AI Assistant',
        botAvatar: '',
        welcomeMessage: 'Hello! How can I help you today?',
        position: 'bottom-right'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.businesses.push(business);
    this.save();
    return business;
  }

  async updateWidgetSettings(businessId, settings) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    business.widgetSettings = { ...business.widgetSettings, ...settings };
    business.updatedAt = new Date().toISOString();
    this.save();
    return business.widgetSettings;
  }

  async updateVerification(businessId, verificationData) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    business.verification = { ...business.verification, ...verificationData };
    business.updatedAt = new Date().toISOString();
    this.save();
    return business;
  }

  async updateGoogleSheets(businessId, updates) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    business.googleSheets = { ...business.googleSheets, ...updates };
    business.updatedAt = new Date().toISOString();
    this.save();
    return business.googleSheets;
  }

  async updateNotificationEmail(businessId, notificationEmail) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    business.notificationEmail = notificationEmail;
    business.updatedAt = new Date().toISOString();
    this.save();
    return business;
  }

  // FAQs methods
  async getFAQsForBusiness(businessId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    return business ? business.faqs : [];
  }

  async addFAQ(businessId, faqData) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;

    const faq = {
      id: require('crypto').randomBytes(16).toString('hex'),
      ...faqData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    business.faqs.push(faq);
    business.updatedAt = new Date().toISOString();
    this.save();
    return faq;
  }

  async updateFAQ(businessId, faqId, updates) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;

    const faq = business.faqs.find(f => f.id === faqId);
    if (!faq) return null;

    Object.assign(faq, updates, { updatedAt: new Date().toISOString() });
    business.updatedAt = new Date().toISOString();
    this.save();
    return faq;
  }

  async deleteFAQ(businessId, faqId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return false;

    const faqIndex = business.faqs.findIndex(f => f.id === faqId);
    if (faqIndex === -1) return false;

    business.faqs.splice(faqIndex, 1);
    business.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  // Leads methods
  async getLeadsForBusiness(businessId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    return business ? business.leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
  }

  async addLead(businessId, leadData) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;

    const lead = {
      id: require('crypto').randomBytes(16).toString('hex'),
      ...leadData,
      status: leadData.status || 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    business.leads.push(lead);
    business.updatedAt = new Date().toISOString();
    this.save();
    return lead;
  }

  async updateLeadStatus(businessId, leadId, status) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;

    const lead = business.leads.find(l => l.id === leadId);
    if (!lead) return null;

    lead.status = status;
    lead.updatedAt = new Date().toISOString();
    business.updatedAt = new Date().toISOString();
    this.save();
    return lead;
  }

  // Knowledge sources methods
  async addWebsite(businessId, url) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;

    const website = {
      id: require('crypto').randomBytes(16).toString('hex'),
      url,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    business.knowledgeSources.websites.push(website);
    business.updatedAt = new Date().toISOString();
    this.save();
    return website;
  }

  async addPdf(businessId, originalName, filename) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;

    const pdf = {
      id: require('crypto').randomBytes(16).toString('hex'),
      originalName,
      filename,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    business.knowledgeSources.pdfs.push(pdf);
    business.updatedAt = new Date().toISOString();
    this.save();
    return pdf;
  }

  async deleteWebsite(businessId, websiteId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return false;

    const websiteIndex = business.knowledgeSources.websites.findIndex(w => w.id === websiteId);
    if (websiteIndex === -1) return false;

    business.knowledgeSources.websites.splice(websiteIndex, 1);
    business.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  async deletePdf(businessId, pdfId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return false;

    const pdfIndex = business.knowledgeSources.pdfs.findIndex(p => p.id === pdfId);
    if (pdfIndex === -1) return false;

    const pdf = business.knowledgeSources.pdfs[pdfIndex];
    if (pdf.filename) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../uploads', pdf.filename);
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    business.knowledgeSources.pdfs.splice(pdfIndex, 1);
    business.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }
  
  async getKnowledgeSourcesForBusiness(businessId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    return business ? business.knowledgeSources : { websites: [], pdfs: [] };
  }

  async updateKnowledgeSourceStatus(businessId, sourceId, status, opts = {}) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;

    const { websites, pdfs } = business.knowledgeSources || { websites: [], pdfs: [] };
    let found = false;

    const update = (item) => {
      item.status = status;
      if (opts.lastTrainedAt) item.lastTrainedAt = opts.lastTrainedAt;
      if (opts.chunksCount !== undefined) item.chunksCount = opts.chunksCount;
      if (opts.error) item.error = opts.error;
      found = true;
    };

    const w = websites.find(w => w.id === sourceId);
    if (w) update(w);
    const p = pdfs.find(p => p.id === sourceId);
    if (p) update(p);

    if (found) {
      business.updatedAt = new Date().toISOString();
      this.save();
      return true;
    }
    return false;
  }
  
  async updateBusiness(businessId, updates) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    Object.assign(business, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return business;
  }
  
  async deleteBusiness(businessId, userId) {
    const index = this.data.businesses.findIndex(b => b.id === businessId && b.userId === userId);
    if (index === -1) return false;
    
    this.data.businesses.splice(index, 1);
    this.save();
    return true;
  }
  
  async updateLead(businessId, leadId, updates) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    const lead = business.leads.find(l => l.id === leadId);
    if (!lead) return null;
    
    Object.assign(lead, updates, { updatedAt: new Date().toISOString() });
    business.updatedAt = new Date().toISOString();
    this.save();
    return lead;
  }
  
  // Conversations methods
  async getConversationsForBusiness(businessId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    return business ? (business.conversations || []) : [];
  }
  
  async getConversation(businessId, conversationId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    return (business.conversations || []).find(c => c.id === conversationId);
  }
  
  async createConversation(businessId, visitor) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    if (!business.conversations) business.conversations = [];
    
    const conversation = {
      id: require('crypto').randomBytes(16).toString('hex'),
      visitor: visitor || { name: '', email: '', phone: '' },
      messages: [],
      status: 'open',
      score: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    business.conversations.push(conversation);
    business.updatedAt = new Date().toISOString();
    this.save();
    return conversation;
  }
  
  async updateConversation(businessId, conversationId, updates) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    if (!business.conversations) return null;
    const conversation = business.conversations.find(c => c.id === conversationId);
    if (!conversation) return null;
    
    Object.assign(conversation, updates, { updatedAt: new Date().toISOString() });
    business.updatedAt = new Date().toISOString();
    this.save();
    return conversation;
  }
  
  async addMessageToConversation(businessId, conversationId, message) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    if (!business.conversations) return null;
    const conversation = business.conversations.find(c => c.id === conversationId);
    if (!conversation) return null;
    
    if (!conversation.messages) conversation.messages = [];
    conversation.messages.push({
      ...message,
      id: require('crypto').randomBytes(16).toString('hex'),
      createdAt: new Date().toISOString()
    });
    conversation.updatedAt = new Date().toISOString();
    business.updatedAt = new Date().toISOString();
    this.save();
    return message;
  }
  
  // Unanswered questions methods
  async getUnansweredQuestions(businessId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    return business ? (business.unansweredQuestions || []) : [];
  }
  
  async addUnansweredQuestion(businessId, question) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    if (!business.unansweredQuestions) business.unansweredQuestions = [];
    
    const newQuestion = {
      id: require('crypto').randomBytes(16).toString('hex'),
      question,
      count: 1,
      lastAskedAt: new Date().toISOString(),
      answered: false,
      createdAt: new Date().toISOString()
    };
    
    business.unansweredQuestions.push(newQuestion);
    business.updatedAt = new Date().toISOString();
    this.save();
    return newQuestion;
  }
  
  async markQuestionAnswered(businessId, questionId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    if (!business.unansweredQuestions) return null;
    const question = business.unansweredQuestions.find(q => q.id === questionId);
    if (!question) return null;
    
    question.answered = true;
    business.updatedAt = new Date().toISOString();
    this.save();
    return question;
  }
  
  // Webhooks methods
  async getWebhooks(businessId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    return business ? (business.webhooks || []) : [];
  }
  
  async addWebhook(businessId, webhookData) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    if (!business.webhooks) business.webhooks = [];
    
    const webhook = {
      id: require('crypto').randomBytes(16).toString('hex'),
      ...webhookData,
      enabled: true,
      createdAt: new Date().toISOString()
    };
    
    business.webhooks.push(webhook);
    business.updatedAt = new Date().toISOString();
    this.save();
    return webhook;
  }
  
  async updateWebhook(businessId, webhookId, updates) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    if (!business.webhooks) return null;
    const webhook = business.webhooks.find(w => w.id === webhookId);
    if (!webhook) return null;
    
    Object.assign(webhook, updates);
    business.updatedAt = new Date().toISOString();
    this.save();
    return webhook;
  }
  
  async deleteWebhook(businessId, webhookId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return false;
    
    if (!business.webhooks) return false;
    const index = business.webhooks.findIndex(w => w.id === webhookId);
    if (index === -1) return false;
    
    business.webhooks.splice(index, 1);
    business.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }
  
  // Conversation Notes methods
  async addConversationNote(businessId, conversationId, noteData) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    if (!business.conversations) return null;
    const conversation = business.conversations.find(c => c.id === conversationId);
    if (!conversation) return null;
    
    if (!conversation.notes) conversation.notes = [];
    
    const note = {
      id: require('crypto').randomBytes(16).toString('hex'),
      ...noteData,
      createdAt: new Date().toISOString()
    };
    conversation.notes.push(note);
    conversation.updatedAt = new Date().toISOString();
    business.updatedAt = new Date().toISOString();
    this.save();
    return note;
  }
  
  async getConversationNotes(businessId, conversationId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return [];
    
    if (!business.conversations) return [];
    const conversation = business.conversations.find(c => c.id === conversationId);
    if (!conversation) return [];
    
    return conversation.notes || [];
  }
  
  async deleteConversationNote(businessId, conversationId, noteId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return false;
    
    if (!business.conversations) return false;
    const conversation = business.conversations.find(c => c.id === conversationId);
    if (!conversation) return false;
    
    if (!conversation.notes) return false;
    const index = conversation.notes.findIndex(n => n.id === noteId);
    if (index === -1) return false;
    
    conversation.notes.splice(index, 1);
    conversation.updatedAt = new Date().toISOString();
    business.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }
  
  // Analytics methods
  async recordAnalytics(businessId, data) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    
    if (!business.analytics) {
      business.analytics = {
        totalMessages: 0,
        aiResolved: 0,
        humanEscalated: 0,
        leadsCaptured: 0,
        faqHits: {},
        lastActive: null,
        dailyUsage: [],
        weeklyUsage: [],
        responseTimes: [], // Track AI response times in ms
        messageHistory: [] // Detailed message history
      };
    }
    
    // Update core metrics
    if (data.totalMessages) business.analytics.totalMessages += 1;
    if (data.aiResolved) business.analytics.aiResolved += 1;
    if (data.humanEscalated) business.analytics.humanEscalated += 1;
    if (data.leadsCaptured) business.analytics.leadsCaptured += 1;
    if (data.faqId) {
      business.analytics.faqHits[data.faqId] = (business.analytics.faqHits[data.faqId] || 0) + 1;
    }
    if (data.responseTime) {
      business.analytics.responseTimes.push(data.responseTime);
      // Keep only last 1000 response times for performance
      if (business.analytics.responseTimes.length > 1000) {
        business.analytics.responseTimes.shift();
      }
    }
    if (data.message) {
      business.analytics.messageHistory.push({
        ...data.message,
        timestamp: new Date().toISOString()
      });
      // Keep only last 500 messages
      if (business.analytics.messageHistory.length > 500) {
        business.analytics.messageHistory.shift();
      }
    }
    
    // Update daily/weekly usage
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date(Date.now() - new Date().getDay() * 86400000).toISOString().split('T')[0];
    
    // Daily usage
    let dayEntry = business.analytics.dailyUsage.find(d => d.date === today);
    if (!dayEntry) {
      dayEntry = { date: today, messages: 0, aiResolved: 0, humanEscalated: 0, leadsCaptured: 0 };
      business.analytics.dailyUsage.push(dayEntry);
    }
    if (data.totalMessages) dayEntry.messages += 1;
    if (data.aiResolved) dayEntry.aiResolved += 1;
    if (data.humanEscalated) dayEntry.humanEscalated += 1;
    if (data.leadsCaptured) dayEntry.leadsCaptured += 1;
    
    business.analytics.lastActive = new Date().toISOString();
    business.updatedAt = new Date().toISOString();
    this.save();
    return business.analytics;
  }
  
  async getAnalytics(businessId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business || !business.analytics) {
      return {
        totalMessages: 0,
        aiResolved: 0,
        humanEscalated: 0,
        leadsCaptured: 0,
        faqHits: {},
        lastActive: null,
        dailyUsage: [],
        responseTimes: [],
        messageHistory: []
      };
    }
    
    // Calculate derived metrics
    const analytics = { ...business.analytics };
    analytics.resolutionRate = analytics.totalMessages > 0 
      ? Math.round((analytics.aiResolved / analytics.totalMessages) * 100) 
      : 0;
    analytics.averageResponseTime = analytics.responseTimes.length > 0
      ? Math.round(analytics.responseTimes.reduce((a, b) => a + b, 0) / analytics.responseTimes.length)
      : 0;
    
    return analytics;
  }

  // Canned Responses methods
  async getCannedResponses(businessId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    return business ? (business.cannedResponses || []) : [];
  }

  async addCannedResponse(businessId, responseData) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;

    if (!business.cannedResponses) business.cannedResponses = [];

    const response = {
      id: require('crypto').randomBytes(16).toString('hex'),
      ...responseData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    business.cannedResponses.push(response);
    business.updatedAt = new Date().toISOString();
    this.save();
    return response;
  }

  async updateCannedResponse(businessId, responseId, updates) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;

    if (!business.cannedResponses) return null;
    const response = business.cannedResponses.find(r => r.id === responseId);
    if (!response) return null;

    Object.assign(response, updates, { updatedAt: new Date().toISOString() });
    business.updatedAt = new Date().toISOString();
    this.save();
    return response;
  }

  async deleteCannedResponse(businessId, responseId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return false;

    if (!business.cannedResponses) return false;
    const responseIndex = business.cannedResponses.findIndex(r => r.id === responseId);
    if (responseIndex === -1) return false;

    business.cannedResponses.splice(responseIndex, 1);
    business.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  async addConversationTag(businessId, conversationId, tag) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    const conv = business.conversations?.find(c => c.id === conversationId);
    if (!conv) return null;

    if (!conv.tags) conv.tags = [];
    if (!conv.tags.includes(tag)) {
      conv.tags.push(tag);
      business.updatedAt = new Date().toISOString();
      this.save();
    }
    return conv;
  }

  async removeConversationTag(businessId, conversationId, tag) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    const conv = business.conversations?.find(c => c.id === conversationId);
    if (!conv) return null;

    if (conv.tags) {
      conv.tags = conv.tags.filter(t => t !== tag);
      business.updatedAt = new Date().toISOString();
      this.save();
    }
    return conv;
  }

  async assignConversation(businessId, conversationId, assignee) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    const conv = business.conversations?.find(c => c.id === conversationId);
    if (!conv) return null;

    conv.assignee = assignee;
    business.updatedAt = new Date().toISOString();
    this.save();
    return conv;
  }

  async getTriggers(businessId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    return business ? (business.triggers || []) : [];
  }

  async addTrigger(businessId, triggerData) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    if (!business.triggers) business.triggers = [];
    const trigger = {
      id: require('crypto').randomBytes(16).toString('hex'),
      ...triggerData,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    business.triggers.push(trigger);
    business.updatedAt = new Date().toISOString();
    this.save();
    return trigger;
  }

  async updateTrigger(businessId, triggerId, updates) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return null;
    if (!business.triggers) return null;
    const trigger = business.triggers.find(t => t.id === triggerId);
    if (!trigger) return null;
    Object.assign(trigger, updates, { updatedAt: new Date().toISOString() });
    business.updatedAt = new Date().toISOString();
    this.save();
    return trigger;
  }

  async deleteTrigger(businessId, triggerId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    if (!business) return false;
    if (!business.triggers) return false;
    const index = business.triggers.findIndex(t => t.id === triggerId);
    if (index === -1) return false;
    business.triggers.splice(index, 1);
    business.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }
}

// Neon PostgreSQL storage
class NeonStorage extends BaseStorage {
  constructor() {
    super();
    this.pool = null;
  }

  async init() {
    const { Pool } = require('pg');
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    // Test the connection
    await this.pool.query('SELECT NOW()');
    // Create tables if they don't exist
    await this.createTables();
  }

  async createTables() {
    const client = await this.pool.connect();
    try {
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create businesses table
      await client.query(`
        CREATE TABLE IF NOT EXISTS businesses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          domain TEXT,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          qdrant_collection TEXT,
          widget_settings JSONB DEFAULT '{}',
          notification_email TEXT,
          verification JSONB DEFAULT '{"status":"unverified","method":null,"token":null,"verifiedAt":null}',
          google_sheets JSONB DEFAULT '{"enabled":false,"spreadsheetId":"","serviceAccountKey":""}',
          analytics JSONB DEFAULT '{"totalMessages":0,"aiResolved":0,"humanEscalated":0,"leadsCaptured":0,"faqHits":{},"lastActive":null,"dailyUsage":[],"weeklyUsage":[],"responseTimes":[],"messageHistory":[]}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Alter businesses table to add new analytics fields if missing
      await client.query(`
        ALTER TABLE businesses 
        ALTER COLUMN analytics SET DEFAULT '{"totalMessages":0,"aiResolved":0,"humanEscalated":0,"leadsCaptured":0,"faqHits":{},"lastActive":null,"dailyUsage":[],"weeklyUsage":[],"responseTimes":[],"messageHistory":[]}'
      `);

      // Create faqs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS faqs (
          id TEXT PRIMARY KEY,
          business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
          question_en TEXT,
          question_bn TEXT,
          answer_en TEXT,
          answer_bn TEXT,
          is_suggested BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create knowledge_sources table
      await client.query(`
        CREATE TABLE IF NOT EXISTS knowledge_sources (
          id TEXT PRIMARY KEY,
          business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('website', 'pdf')),
          url TEXT,
          original_name TEXT,
          filename TEXT,
          status TEXT DEFAULT 'pending',
          error TEXT,
          chunks_count INTEGER,
          last_trained_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create conversations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
          visitor JSONB DEFAULT '{"name":"","email":"","phone":""}',
          messages JSONB DEFAULT '[]',
          status TEXT DEFAULT 'open',
          lead_id TEXT,
          score INTEGER DEFAULT 0,
          tags TEXT[] DEFAULT '{}',
          assignee TEXT,
          notes JSONB DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Add notes column to conversations if not exists
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'conversations' 
            AND column_name = 'notes'
          ) THEN
            ALTER TABLE conversations ADD COLUMN notes JSONB DEFAULT '[]';
          END IF;
        END$$;
      `);

      // Create leads table
      await client.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
          name TEXT,
          email TEXT,
          phone TEXT,
          company TEXT,
          notes TEXT,
          message TEXT,
          status TEXT DEFAULT 'new',
          score INTEGER DEFAULT 0,
          conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create unanswered_questions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS unanswered_questions (
          id TEXT PRIMARY KEY,
          business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
          question TEXT NOT NULL,
          count INTEGER DEFAULT 1,
          last_asked_at TIMESTAMPTZ DEFAULT NOW(),
          answered BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(business_id, question)
        )
      `);

      // Create canned_responses table
      await client.query(`
        CREATE TABLE IF NOT EXISTS canned_responses (
          id TEXT PRIMARY KEY,
          business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          content_en TEXT,
          content_bn TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create triggers table
      await client.query(`
        CREATE TABLE IF NOT EXISTS triggers (
          id TEXT PRIMARY KEY,
          business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'time_on_page',
          conditions JSONB DEFAULT '{}',
          message TEXT NOT NULL,
          enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create webhooks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS webhooks (
          id TEXT PRIMARY KEY,
          business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          events JSONB DEFAULT '[]',
          enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Add indexes for performance
      await client.query(`CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_faqs_business_id ON faqs(business_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_knowledge_sources_business_id ON knowledge_sources(business_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_unanswered_questions_business_id ON unanswered_questions(business_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_business_id ON webhooks(business_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_canned_responses_business_id ON canned_responses(business_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_triggers_business_id ON triggers(business_id)`);

      // Add missing columns to knowledge_sources table
      const addColumnIfNotExists = async (columnName, columnDef) => {
        try {
          await client.query(`ALTER TABLE knowledge_sources ADD COLUMN ${columnName} ${columnDef}`);
        } catch (e) {
          if (!e.message.includes('already exists')) {
            throw e;
          }
        }
      };

      await addColumnIfNotExists('error', 'TEXT');
      await addColumnIfNotExists('chunks_count', 'INTEGER');
      await addColumnIfNotExists('last_trained_at', 'TIMESTAMPTZ');

    } finally {
      client.release();
    }
  }

  // Users methods
  async getUser(email) {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async createUser(email, password, name) {
    // Check if user already exists
    const existingUser = await this.getUser(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const id = require('crypto').randomBytes(16).toString('hex');

    const result = await this.pool.query(
      'INSERT INTO users (id, email, password, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, email, name, created_at',
      [id, email, hashedPassword, name]
    );
    return result.rows[0];
  }

  async loginUser(email, password) {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Return user without password
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async getUserById(id) {
    const result = await this.pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  // Businesses methods
  async getBusinessesForUser(userId) {
    const result = await this.pool.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) return [];
    
    const businessIds = result.rows.map(b => b.id);
    
    // Get all FAQs, leads, knowledge sources, conversations, unanswered questions, canned responses, and triggers in single queries
    const [faqsResult, leadsResult, knowledgeSourcesResult, conversationsResult, unansweredQuestionsResult, cannedResponsesResult, triggersResult] = await Promise.all([
        this.pool.query('SELECT * FROM faqs WHERE business_id = ANY($1)', [businessIds]),
        this.pool.query('SELECT * FROM leads WHERE business_id = ANY($1) ORDER BY created_at DESC', [businessIds]),
        this.pool.query('SELECT * FROM knowledge_sources WHERE business_id = ANY($1)', [businessIds]),
        this.pool.query('SELECT * FROM conversations WHERE business_id = ANY($1) ORDER BY updated_at DESC', [businessIds]),
        this.pool.query('SELECT * FROM unanswered_questions WHERE business_id = ANY($1) ORDER BY last_asked_at DESC', [businessIds]),
        this.pool.query('SELECT * FROM canned_responses WHERE business_id = ANY($1) ORDER BY created_at DESC', [businessIds]),
        this.pool.query('SELECT * FROM triggers WHERE business_id = ANY($1) ORDER BY created_at DESC', [businessIds])
    ]);
    
    // Organize data by business ID
    const faqsByBusiness = {};
    faqsResult.rows.forEach(faq => {
      if (!faqsByBusiness[faq.business_id]) faqsByBusiness[faq.business_id] = [];
      faqsByBusiness[faq.business_id].push({
        ...faq,
        questionEn: faq.question_en,
        questionBn: faq.question_bn,
        answerEn: faq.answer_en,
        answerBn: faq.answer_bn,
        isSuggested: faq.is_suggested,
        createdAt: faq.created_at,
        updatedAt: faq.updated_at
      });
    });
    
    const leadsByBusiness = {};
    leadsResult.rows.forEach(lead => {
      if (!leadsByBusiness[lead.business_id]) leadsByBusiness[lead.business_id] = [];
      leadsByBusiness[lead.business_id].push({
        ...lead,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at
      });
    });
    
    const knowledgeSourcesByBusiness = {};
    knowledgeSourcesResult.rows.forEach(ks => {
      if (!knowledgeSourcesByBusiness[ks.business_id]) knowledgeSourcesByBusiness[ks.business_id] = { websites: [], pdfs: [] };
      const converted = {
        id: ks.id,
        type: ks.type,
        url: ks.url,
        originalName: ks.original_name,
        filename: ks.filename,
        status: ks.status,
        error: ks.error,
        chunksCount: ks.chunks_count,
        createdAt: ks.created_at,
        updatedAt: ks.updated_at,
        lastTrainedAt: ks.last_trained_at
      };
      if (ks.type === 'website') {
        knowledgeSourcesByBusiness[ks.business_id].websites.push(converted);
      } else {
        knowledgeSourcesByBusiness[ks.business_id].pdfs.push(converted);
      }
    });

    const conversationsByBusiness = {};
    conversationsResult.rows.forEach(conv => {
      if (!conversationsByBusiness[conv.business_id]) conversationsByBusiness[conv.business_id] = [];
      conversationsByBusiness[conv.business_id].push({
        ...conv,
        visitor: conv.visitor,
        messages: conv.messages,
        status: conv.status,
        leadId: conv.lead_id,
        score: conv.score,
        tags: conv.tags,
        assignee: conv.assignee,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at
      });
    });

    const unansweredQuestionsByBusiness = {};
    unansweredQuestionsResult.rows.forEach(q => {
      if (!unansweredQuestionsByBusiness[q.business_id]) unansweredQuestionsByBusiness[q.business_id] = [];
      unansweredQuestionsByBusiness[q.business_id].push({
        ...q,
        lastAskedAt: q.last_asked_at,
        createdAt: q.created_at
      });
    });

    const cannedResponsesByBusiness = {};
    cannedResponsesResult.rows.forEach(r => {
        if (!cannedResponsesByBusiness[r.business_id]) cannedResponsesByBusiness[r.business_id] = [];
        cannedResponsesByBusiness[r.business_id].push({
            ...r,
            contentEn: r.content_en,
            contentBn: r.content_bn,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        });
    });

    const triggersByBusiness = {};
    triggersResult.rows.forEach(t => {
        if (!triggersByBusiness[t.business_id]) triggersByBusiness[t.business_id] = [];
        triggersByBusiness[t.business_id].push({
            ...t,
            conditions: t.conditions,
            createdAt: t.created_at,
            updatedAt: t.updated_at
        });
    });
    
    // Assemble businesses
    const businesses = result.rows.map(businessRow => ({
      ...businessRow,
      qdrantCollection: businessRow.qdrant_collection,
      widgetSettings: businessRow.widget_settings,
      notificationEmail: businessRow.notification_email,
      googleSheets: businessRow.google_sheets,
      analytics: businessRow.analytics,
      createdAt: businessRow.created_at,
      updatedAt: businessRow.updated_at,
      faqs: faqsByBusiness[businessRow.id] || [],
      leads: leadsByBusiness[businessRow.id] || [],
      knowledgeSources: knowledgeSourcesByBusiness[businessRow.id] || { websites: [], pdfs: [] },
      conversations: conversationsByBusiness[businessRow.id] || [],
      unansweredQuestions: unansweredQuestionsByBusiness[businessRow.id] || [],
      cannedResponses: cannedResponsesByBusiness[businessRow.id] || [],
      triggers: triggersByBusiness[businessRow.id] || []
    }));
    
    return businesses;
  }

  async getBusiness(businessId, userId = null) {
    let query = 'SELECT * FROM businesses WHERE id = $1';
    const params = [businessId];
    if (userId) {
      query += ' AND user_id = $2';
      params.push(userId);
    }
    const result = await this.pool.query(query, params);
    if (!result.rows[0]) return null;
    
    // Load FAQs, knowledge sources, and leads in parallel
    const business = result.rows[0];
    // Convert snake_case to camelCase
    business.qdrantCollection = business.qdrant_collection;
    business.widgetSettings = business.widget_settings;
    business.notificationEmail = business.notification_email;
    business.googleSheets = business.google_sheets;
    business.analytics = business.analytics;
    business.createdAt = business.created_at;
    business.updatedAt = business.updated_at;
    
    // Get all related data in parallel
    const [faqs, leads, knowledgeSources, conversations, unansweredQuestions, cannedResponses, triggers] = await Promise.all([
      this.getFAQsForBusiness(businessId),
      this.getLeadsForBusiness(businessId),
      this.getKnowledgeSourcesForBusiness(businessId),
      this.getConversationsForBusiness(businessId),
      this.getUnansweredQuestions(businessId),
      this.getCannedResponses(businessId),
      this.getTriggers(businessId)
    ]);

    business.faqs = faqs;
    business.leads = leads;
    business.knowledgeSources = knowledgeSources;
    business.conversations = conversations;
    business.unansweredQuestions = unansweredQuestions;
    business.cannedResponses = cannedResponses;
    business.triggers = triggers;
    return business;
  }

  async createBusiness(name, domain, userId) {
    if (!userId) {
      throw new Error('Invalid user session');
    }

    const userResult = await this.pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error('Invalid user session');
    }

    const id = require('crypto').randomBytes(16).toString('hex');
    const qdrantCollection = `aics_business_${id}`;
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    
    const result = await this.pool.query(
      'INSERT INTO businesses (id, name, domain, user_id, qdrant_collection, verification, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
      [id, name, domain, userId, qdrantCollection, JSON.stringify({
        status: 'pending',
        token: verificationToken
      })]
    );
    const b = result.rows[0];
    return {
      id: b.id,
      name: b.name,
      domain: b.domain,
      userId: b.user_id,
      qdrantCollection: b.qdrant_collection,
      widgetSettings: b.widget_settings,
      notificationEmail: b.notification_email,
      verification: b.verification,
      googleSheets: b.google_sheets,
      analytics: b.analytics,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    };
  }

  async updateWidgetSettings(businessId, settings) {
    const result = await this.pool.query(
      'UPDATE businesses SET widget_settings = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(settings), businessId]
    );
    return result.rows[0]?.widget_settings;
  }

  async updateVerification(businessId, verificationData) {
    const result = await this.pool.query(
      'UPDATE businesses SET verification = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(verificationData), businessId]
    );
    if (!result.rows[0]) return null;
    const business = result.rows[0];
    return {
      ...business,
      qdrantCollection: business.qdrant_collection,
      widgetSettings: business.widget_settings,
      notificationEmail: business.notification_email,
      createdAt: business.created_at,
      updatedAt: business.updated_at
    };
  }

  async updateGoogleSheets(businessId, updates) {
    // First get current google_sheets
    const getResult = await this.pool.query('SELECT google_sheets FROM businesses WHERE id = $1', [businessId]);
    if (!getResult.rows[0]) return null;
    const current = getResult.rows[0].google_sheets || {};
    const newGoogleSheets = { ...current, ...updates };
    
    const result = await this.pool.query(
      'UPDATE businesses SET google_sheets = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(newGoogleSheets), businessId]
    );
    return result.rows[0]?.google_sheets;
  }

  async updateNotificationEmail(businessId, notificationEmail) {
    const result = await this.pool.query(
      'UPDATE businesses SET notification_email = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [notificationEmail, businessId]
    );
    if (!result.rows[0]) return null;
    const business = result.rows[0];
    return {
      ...business,
      qdrantCollection: business.qdrant_collection,
      widgetSettings: business.widget_settings,
      notificationEmail: business.notification_email,
      createdAt: business.created_at,
      updatedAt: business.updated_at
    };
  }

  // FAQs methods
  async getFAQsForBusiness(businessId) {
    const result = await this.pool.query('SELECT * FROM faqs WHERE business_id = $1', [businessId]);
    return result.rows.map(faq => {
      return {
        ...faq,
        questionEn: faq.question_en,
        questionBn: faq.question_bn,
        answerEn: faq.answer_en,
        answerBn: faq.answer_bn,
        isSuggested: faq.is_suggested,
        createdAt: faq.created_at,
        updatedAt: faq.updated_at
      };
    });
  }

  async addFAQ(businessId, faqData) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const sanitizedFaq = sanitizeObject(faqData);
    const result = await this.pool.query(
      'INSERT INTO faqs (id, business_id, question_en, question_bn, answer_en, answer_bn, is_suggested, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
      [id, businessId, sanitizedFaq.questionEn, sanitizedFaq.questionBn, sanitizedFaq.answerEn, sanitizedFaq.answerBn, sanitizedFaq.isSuggested]
    );
    const faq = result.rows[0];
    return {
      ...faq,
      questionEn: faq.question_en,
      questionBn: faq.question_bn,
      answerEn: faq.answer_en,
      answerBn: faq.answer_bn,
      isSuggested: faq.is_suggested,
      createdAt: faq.created_at,
      updatedAt: faq.updated_at
    };
  }

  async updateFAQ(businessId, faqId, updates) {
    const sanitizedUpdates = sanitizeObject(updates);
    let query = 'UPDATE faqs SET ';
    const params = [];
    let paramIndex = 1;
    
    if (sanitizedUpdates.questionEn) {
      query += `question_en = $${paramIndex++}, `;
      params.push(sanitizedUpdates.questionEn);
    }
    if (sanitizedUpdates.questionBn) {
      query += `question_bn = $${paramIndex++}, `;
      params.push(sanitizedUpdates.questionBn);
    }
    if (sanitizedUpdates.answerEn) {
      query += `answer_en = $${paramIndex++}, `;
      params.push(sanitizedUpdates.answerEn);
    }
    if (sanitizedUpdates.answerBn) {
      query += `answer_bn = $${paramIndex++}, `;
      params.push(sanitizedUpdates.answerBn);
    }
    query += 'updated_at = NOW() WHERE id = $' + paramIndex++ + ' AND business_id = $' + paramIndex + ' RETURNING *';
    params.push(faqId, businessId);
    
    const result = await this.pool.query(query, params);
    if (!result.rows[0]) return null;
    const faq = result.rows[0];
    return {
      ...faq,
      questionEn: faq.question_en,
      questionBn: faq.question_bn,
      answerEn: faq.answer_en,
      answerBn: faq.answer_bn,
      isSuggested: faq.is_suggested,
      createdAt: faq.created_at,
      updatedAt: faq.updated_at
    };
  }

  async deleteFAQ(businessId, faqId) {
    const result = await this.pool.query('DELETE FROM faqs WHERE id = $1 AND business_id = $2', [faqId, businessId]);
    return result.rowCount > 0;
  }

  // Leads methods
  async getLeadsForBusiness(businessId) {
    const result = await this.pool.query('SELECT * FROM leads WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
    return result.rows.map(lead => {
      return {
        ...lead,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at
      };
    });
  }

  async addLead(businessId, leadData) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const sanitizedLead = sanitizeObject(leadData);
    const result = await this.pool.query(
      'INSERT INTO leads (id, business_id, name, email, phone, message, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
      [id, businessId, sanitizedLead.name, sanitizedLead.email, sanitizedLead.phone, sanitizedLead.message, sanitizedLead.status || 'new']
    );
    const lead = result.rows[0];
    return {
      ...lead,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at
    };
  }

  async updateLeadStatus(businessId, leadId, status) {
    const result = await this.pool.query(
      'UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING *',
      [status, leadId, businessId]
    );
    if (!result.rows[0]) return null;
    const lead = result.rows[0];
    return {
      ...lead,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at
    };
  }

  // Knowledge sources methods
  async getKnowledgeSourcesForBusiness(businessId) {
    console.log("===== getKnowledgeSourcesForBusiness called for businessId:", businessId);
    const result = await this.pool.query('SELECT * FROM knowledge_sources WHERE business_id = $1', [businessId]);
    console.log("===== knowledge_sources rows from DB:", result.rows);
    const websites = [];
    const pdfs = [];
    result.rows.forEach(ks => {
      const converted = {
        id: ks.id,
        type: ks.type,
        url: ks.url,
        originalName: ks.original_name,
        filename: ks.filename,
        status: ks.status,
        error: ks.error,
        chunksCount: ks.chunks_count,
        createdAt: ks.created_at,
        updatedAt: ks.updated_at,
        lastTrainedAt: ks.last_trained_at
      };
      if (ks.type === 'website') {
        websites.push(converted);
      } else {
        pdfs.push(converted);
      }
    });
    return { websites, pdfs };
  }

  async updateKnowledgeSourceStatus(businessId, sourceId, status, opts = {}) {
    const { lastTrainedAt, chunksCount, error } = opts;
    const query = `UPDATE knowledge_sources SET status = $1, last_trained_at = $2, chunks_count = $3, error = $4, updated_at = NOW() WHERE id = $5 AND business_id = $6`;
    await this.pool.query(query, [status, lastTrainedAt || null, chunksCount || null, error || null, sourceId, businessId]);
    return true;
  }

  async addWebsite(businessId, url) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const result = await this.pool.query(
      'INSERT INTO knowledge_sources (id, business_id, type, url, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
      [id, businessId, 'website', url, 'pending']
    );
    const ks = result.rows[0];
    return {
      id: ks.id,
      type: ks.type,
      url: ks.url,
      originalName: ks.original_name,
      filename: ks.filename,
      status: ks.status,
      error: ks.error,
      chunksCount: ks.chunks_count,
      createdAt: ks.created_at,
      updatedAt: ks.updated_at,
      lastTrainedAt: ks.last_trained_at
    };
  }

  async addPdf(businessId, originalName, filename) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const result = await this.pool.query(
      'INSERT INTO knowledge_sources (id, business_id, type, original_name, filename, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
      [id, businessId, 'pdf', originalName, filename, 'pending']
    );
    const ks = result.rows[0];
    return {
      id: ks.id,
      type: ks.type,
      url: ks.url,
      originalName: ks.original_name,
      filename: ks.filename,
      status: ks.status,
      error: ks.error,
      chunksCount: ks.chunks_count,
      createdAt: ks.created_at,
      updatedAt: ks.updated_at,
      lastTrainedAt: ks.last_trained_at
    };
  }

  async deleteWebsite(businessId, websiteId) {
    const result = await this.pool.query(
      'DELETE FROM knowledge_sources WHERE id = $1 AND business_id = $2 AND type = $3',
      [websiteId, businessId, 'website']
    );
    return result.rowCount > 0;
  }

  async deletePdf(businessId, pdfId) {
    // First get the filename to delete the file
    const getResult = await this.pool.query(
      'SELECT filename FROM knowledge_sources WHERE id = $1 AND business_id = $2 AND type = $3',
      [pdfId, businessId, 'pdf']
    );
    
    if (getResult.rows[0] && getResult.rows[0].filename) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../uploads', getResult.rows[0].filename);
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    const result = await this.pool.query(
      'DELETE FROM knowledge_sources WHERE id = $1 AND business_id = $2 AND type = $3',
      [pdfId, businessId, 'pdf']
    );
    return result.rowCount > 0;
  }

  async updateBusiness(businessId, updates) {
    // Build update query dynamically
    const setClauses = [];
    const params = [];
    let paramIndex = 1;
    
    if (updates.name) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }
    if (updates.domain) {
      setClauses.push(`domain = $${paramIndex++}`);
      params.push(updates.domain);
    }
    if (updates.widgetSettings) {
      setClauses.push(`widget_settings = $${paramIndex++}`);
      params.push(JSON.stringify(updates.widgetSettings));
    }
    if (updates.notificationEmail) {
      setClauses.push(`notification_email = $${paramIndex++}`);
      params.push(updates.notificationEmail);
    }
    if (updates.verification) {
      setClauses.push(`verification = $${paramIndex++}`);
      params.push(JSON.stringify(updates.verification));
    }
    if (updates.googleSheets) {
      setClauses.push(`google_sheets = $${paramIndex++}`);
      params.push(JSON.stringify(updates.googleSheets));
    }
    if (updates.analytics) {
      setClauses.push(`analytics = $${paramIndex++}`);
      params.push(JSON.stringify(updates.analytics));
    }
    
    if (setClauses.length === 0) {
      return this.getBusiness(businessId);
    }
    
    setClauses.push(`updated_at = NOW()`);
    params.push(businessId);
    
    const result = await this.pool.query(
      `UPDATE businesses SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    
    if (!result.rows[0]) return null;
    
    // Return business with nested data
    return this.getBusiness(businessId);
  }
  
  async deleteBusiness(businessId, userId) {
    const result = await this.pool.query(
      'DELETE FROM businesses WHERE id = $1 AND user_id = $2',
      [businessId, userId]
    );
    return result.rowCount > 0;
  }
  
  async updateLead(businessId, leadId, updates) {
    // Build update query dynamically
    const sanitizedUpdates = sanitizeObject(updates);
    const setClauses = [];
    const params = [];
    let paramIndex = 1;
    
    if (sanitizedUpdates.name) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(sanitizedUpdates.name);
    }
    if (sanitizedUpdates.email) {
      setClauses.push(`email = $${paramIndex++}`);
      params.push(sanitizedUpdates.email);
    }
    if (sanitizedUpdates.phone) {
      setClauses.push(`phone = $${paramIndex++}`);
      params.push(sanitizedUpdates.phone);
    }
    if (sanitizedUpdates.company) {
      setClauses.push(`company = $${paramIndex++}`);
      params.push(sanitizedUpdates.company);
    }
    if (sanitizedUpdates.notes) {
      setClauses.push(`notes = $${paramIndex++}`);
      params.push(sanitizedUpdates.notes);
    }
    if (sanitizedUpdates.message) {
      setClauses.push(`message = $${paramIndex++}`);
      params.push(sanitizedUpdates.message);
    }
    if (sanitizedUpdates.status) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(sanitizedUpdates.status);
    }
    if (sanitizedUpdates.score !== undefined) {
      setClauses.push(`score = $${paramIndex++}`);
      params.push(sanitizedUpdates.score);
    }
    
    if (setClauses.length === 0) {
      const result = await this.pool.query('SELECT * FROM leads WHERE id = $1 AND business_id = $2', [leadId, businessId]);
      return result.rows[0] ? { ...result.rows[0], createdAt: result.rows[0].created_at, updatedAt: result.rows[0].updated_at } : null;
    }
    
    setClauses.push(`updated_at = NOW()`);
    params.push(leadId, businessId);
    
    const result = await this.pool.query(
      `UPDATE leads SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND business_id = $${paramIndex} RETURNING *`,
      params
    );
    
    if (!result.rows[0]) return null;
    
    return { ...result.rows[0], createdAt: result.rows[0].created_at, updatedAt: result.rows[0].updated_at };
  }
  
  // Conversations methods
  async getConversationsForBusiness(businessId) {
    const result = await this.pool.query('SELECT * FROM conversations WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
    return result.rows.map(conv => ({
      ...conv,
      visitor: conv.visitor,
      messages: conv.messages,
      status: conv.status,
      leadId: conv.lead_id,
      score: conv.score,
      tags: conv.tags,
      assignee: conv.assignee,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    }));
  }

  async getConversation(businessId, conversationId) {
    const result = await this.pool.query('SELECT * FROM conversations WHERE id = $1 AND business_id = $2', [conversationId, businessId]);
    if (!result.rows[0]) return null;
    const conv = result.rows[0];
    return {
      ...conv,
      visitor: conv.visitor,
      messages: conv.messages,
      status: conv.status,
      leadId: conv.lead_id,
      score: conv.score,
      tags: conv.tags,
      assignee: conv.assignee,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    };
  }
  
  async createConversation(businessId, visitor) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const sanitizedVisitor = sanitizeObject(visitor || { name: '', email: '', phone: '' });
    const result = await this.pool.query(
      'INSERT INTO conversations (id, business_id, visitor, messages, status, score, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
      [id, businessId, JSON.stringify(sanitizedVisitor), JSON.stringify([]), 'open', 0]
    );
    const conv = result.rows[0];
    return {
      ...conv,
      visitor: conv.visitor,
      messages: conv.messages,
      status: conv.status,
      leadId: conv.lead_id,
      score: conv.score,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    };
  }
  
  async updateConversation(businessId, conversationId, updates) {
    // Build update query dynamically
    const sanitizedUpdates = sanitizeObject(updates);
    const setClauses = [];
    const params = [];
    let paramIndex = 1;
    
    if (sanitizedUpdates.visitor) {
      setClauses.push(`visitor = $${paramIndex++}`);
      params.push(JSON.stringify(sanitizedUpdates.visitor));
    }
    if (sanitizedUpdates.messages) {
      const sanitizedMessages = sanitizeObject(sanitizedUpdates.messages);
      setClauses.push(`messages = $${paramIndex++}`);
      params.push(JSON.stringify(sanitizedMessages));
    }
    if (sanitizedUpdates.status) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(sanitizedUpdates.status);
    }
    if (sanitizedUpdates.leadId) {
      setClauses.push(`lead_id = $${paramIndex++}`);
      params.push(sanitizedUpdates.leadId);
    }
    if (sanitizedUpdates.score !== undefined) {
      setClauses.push(`score = $${paramIndex++}`);
      params.push(sanitizedUpdates.score);
    }
    
    if (setClauses.length === 0) {
      return this.getConversation(businessId, conversationId);
    }
    
    setClauses.push(`updated_at = NOW()`);
    params.push(conversationId, businessId);
    
    const result = await this.pool.query(
      `UPDATE conversations SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND business_id = $${paramIndex} RETURNING *`,
      params
    );
    
    if (!result.rows[0]) return null;
    
    return this.getConversation(businessId, conversationId);
  }
  
  async addMessageToConversation(businessId, conversationId, message) {
    // First get existing messages
    const getResult = await this.pool.query('SELECT messages FROM conversations WHERE id = $1 AND business_id = $2', [conversationId, businessId]);
    if (!getResult.rows[0]) return null;
    
    const messages = getResult.rows[0].messages || [];
    const newMessage = {
      ...message,
      id: require('crypto').randomBytes(16).toString('hex'),
      createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    // Sanitize all messages to remove null characters
    const sanitizedMessages = sanitizeObject(messages);
    
    const result = await this.pool.query(
      'UPDATE conversations SET messages = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING *',
      [JSON.stringify(sanitizedMessages), conversationId, businessId]
    );
    
    if (!result.rows[0]) return null;
    
    return newMessage;
  }
  
  // Unanswered questions methods
  async getUnansweredQuestions(businessId) {
    const result = await this.pool.query('SELECT * FROM unanswered_questions WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
    return result.rows.map(q => ({
      ...q,
      lastAskedAt: q.last_asked_at,
      createdAt: q.created_at
    }));
  }
  
  async addUnansweredQuestion(businessId, question) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const sanitizedQuestion = sanitizeString(question);
    try {
      // Try to insert first
      const result = await this.pool.query(
        'INSERT INTO unanswered_questions (id, business_id, question, count, last_asked_at, answered, created_at) VALUES ($1, $2, $3, $4, NOW(), $5, NOW()) RETURNING *',
        [id, businessId, sanitizedQuestion, 1, false]
      );
      const q = result.rows[0];
      return {
        ...q,
        lastAskedAt: q.last_asked_at,
        createdAt: q.created_at
      };
    } catch (error) {
      // If duplicate key, increment count and update last_asked_at
      if (error.code === '23505') { // unique constraint violation
        const result = await this.pool.query(
          'UPDATE unanswered_questions SET count = count + 1, last_asked_at = NOW() WHERE business_id = $1 AND question = $2 RETURNING *',
          [businessId, sanitizedQuestion]
        );
        const q = result.rows[0];
        return {
          ...q,
          lastAskedAt: q.last_asked_at,
          createdAt: q.created_at
        };
      }
      throw error;
    }
  }
  
  async markQuestionAnswered(businessId, questionId) {
    const result = await this.pool.query(
      'UPDATE unanswered_questions SET answered = $1 WHERE id = $2 AND business_id = $3 RETURNING *',
      [true, questionId, businessId]
    );
    if (!result.rows[0]) return null;
    const q = result.rows[0];
    return {
      ...q,
      lastAskedAt: q.last_asked_at,
      createdAt: q.created_at
    };
  }
  
  // Webhooks methods
  async getWebhooks(businessId) {
    const result = await this.pool.query('SELECT * FROM webhooks WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
    return result.rows.map(w => ({
      ...w,
      createdAt: w.created_at
    }));
  }
  
  async addWebhook(businessId, webhookData) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const result = await this.pool.query(
      'INSERT INTO webhooks (id, business_id, url, events, enabled, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [id, businessId, webhookData.url, JSON.stringify(webhookData.events || []), true]
    );
    const w = result.rows[0];
    return {
      ...w,
      createdAt: w.created_at
    };
  }
  
  async updateWebhook(businessId, webhookId, updates) {
    const setClauses = [];
    const params = [];
    let paramIndex = 1;
    
    if (updates.url) {
      setClauses.push(`url = $${paramIndex++}`);
      params.push(updates.url);
    }
    if (updates.events) {
      setClauses.push(`events = $${paramIndex++}`);
      params.push(JSON.stringify(updates.events));
    }
    if (updates.enabled !== undefined) {
      setClauses.push(`enabled = $${paramIndex++}`);
      params.push(updates.enabled);
    }
    
    if (setClauses.length === 0) {
      const result = await this.pool.query('SELECT * FROM webhooks WHERE id = $1 AND business_id = $2', [webhookId, businessId]);
      return result.rows[0] ? { ...result.rows[0], createdAt: result.rows[0].created_at } : null;
    }
    
    params.push(webhookId, businessId);
    
    const result = await this.pool.query(
      `UPDATE webhooks SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND business_id = $${paramIndex} RETURNING *`,
      params
    );
    
    if (!result.rows[0]) return null;
    const w = result.rows[0];
    return {
      ...w,
      createdAt: w.created_at
    };
  }
  
  async deleteWebhook(businessId, webhookId) {
    const result = await this.pool.query(
      'DELETE FROM webhooks WHERE id = $1 AND business_id = $2',
      [webhookId, businessId]
    );
    return result.rowCount > 0;
  }
  
  // Analytics methods
  async recordAnalytics(businessId, data) {
    // First get current analytics
    const getResult = await this.pool.query('SELECT analytics FROM businesses WHERE id = $1', [businessId]);
    if (!getResult.rows[0]) return null;
    
    let analytics = getResult.rows[0].analytics || {
      totalMessages: 0,
      aiResolved: 0,
      humanEscalated: 0,
      leadsCaptured: 0,
      faqHits: {},
      lastActive: null,
      dailyUsage: [],
      weeklyUsage: [],
      responseTimes: [],
      messageHistory: []
    };
    
    // Update core metrics
    if (data.totalMessages) analytics.totalMessages += 1;
    if (data.aiResolved) analytics.aiResolved += 1;
    if (data.humanEscalated) analytics.humanEscalated += 1;
    if (data.leadsCaptured) analytics.leadsCaptured += 1;
    if (data.faqId) {
      analytics.faqHits[data.faqId] = (analytics.faqHits[data.faqId] || 0) + 1;
    }
    if (data.responseTime) {
      analytics.responseTimes.push(data.responseTime);
      if (analytics.responseTimes.length > 1000) analytics.responseTimes.shift();
    }
    if (data.message) {
      analytics.messageHistory.push({
        ...data.message, timestamp: new Date().toISOString()
      });
      if (analytics.messageHistory.length > 500) analytics.messageHistory.shift();
    }
    
    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    let dayEntry = analytics.dailyUsage.find(d => d.date === today);
    if (!dayEntry) {
      dayEntry = { date: today, messages: 0, aiResolved: 0, humanEscalated: 0, leadsCaptured: 0 };
      analytics.dailyUsage.push(dayEntry);
    }
    if (data.totalMessages) dayEntry.messages += 1;
    if (data.aiResolved) dayEntry.aiResolved += 1;
    if (data.humanEscalated) dayEntry.humanEscalated += 1;
    if (data.leadsCaptured) dayEntry.leadsCaptured += 1;
    
    analytics.lastActive = new Date().toISOString();
    
    await this.pool.query(
      'UPDATE businesses SET analytics = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(analytics), businessId]
    );
    
    return analytics;
  }
  
  async getAnalytics(businessId) {
    const getResult = await this.pool.query('SELECT analytics FROM businesses WHERE id = $1', [businessId]);
    if (!getResult.rows[0] || !getResult.rows[0].analytics) {
      return {
        totalMessages: 0,
        aiResolved: 0,
        humanEscalated: 0,
        leadsCaptured: 0,
        faqHits: {},
        lastActive: null,
        dailyUsage: [],
        responseTimes: [],
        messageHistory: []
      };
    }
    
    const analytics = getResult.rows[0].analytics;
    
    // Calculate derived metrics
    analytics.resolutionRate = analytics.totalMessages > 0
      ? Math.round((analytics.aiResolved / analytics.totalMessages) * 100)
      : 0;
    analytics.averageResponseTime = analytics.responseTimes.length > 0
      ? Math.round(analytics.responseTimes.reduce((a, b) => a + b, 0) / analytics.responseTimes.length)
      : 0;
    
    return analytics;
  }

  // Canned Responses methods
  async getCannedResponses(businessId) {
    const result = await this.pool.query('SELECT * FROM canned_responses WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
    return result.rows.map(r => ({
      ...r,
      contentEn: r.content_en,
      contentBn: r.content_bn,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  async addCannedResponse(businessId, responseData) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const sanitizedData = sanitizeObject(responseData);
    const result = await this.pool.query(
      'INSERT INTO canned_responses (id, business_id, title, content_en, content_bn, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
      [id, businessId, sanitizedData.title, sanitizedData.contentEn, sanitizedData.contentBn]
    );
    const r = result.rows[0];
    return {
      ...r,
      contentEn: r.content_en,
      contentBn: r.content_bn,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  async updateCannedResponse(businessId, responseId, updates) {
    const sanitizedUpdates = sanitizeObject(updates);
    let query = 'UPDATE canned_responses SET ';
    const params = [];
    let paramIndex = 1;

    if (sanitizedUpdates.title) {
      query += `title = $${paramIndex++}, `;
      params.push(sanitizedUpdates.title);
    }
    if (sanitizedUpdates.contentEn) {
      query += `content_en = $${paramIndex++}, `;
      params.push(sanitizedUpdates.contentEn);
    }
    if (sanitizedUpdates.contentBn) {
      query += `content_bn = $${paramIndex++}, `;
      params.push(sanitizedUpdates.contentBn);
    }
    query += 'updated_at = NOW() WHERE id = $' + paramIndex++ + ' AND business_id = $' + paramIndex + ' RETURNING *';
    params.push(responseId, businessId);

    const result = await this.pool.query(query, params);
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return {
      ...r,
      contentEn: r.content_en,
      contentBn: r.content_bn,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  async deleteCannedResponse(businessId, responseId) {
    const result = await this.pool.query('DELETE FROM canned_responses WHERE id = $1 AND business_id = $2', [responseId, businessId]);
    return result.rowCount > 0;
  }

  async addConversationTag(businessId, conversationId, tag) {
    const result = await this.pool.query(
      'UPDATE conversations SET tags = array_append(tags, $1), updated_at = NOW() WHERE id = $2 AND business_id = $3 AND NOT ($1 = ANY(tags)) RETURNING *',
      [tag, conversationId, businessId]
    );
    if (!result.rows[0]) return null;
    const conv = result.rows[0];
    return {
      ...conv,
      visitor: conv.visitor,
      messages: conv.messages,
      status: conv.status,
      leadId: conv.lead_id,
      score: conv.score,
      tags: conv.tags,
      assignee: conv.assignee,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    };
  }

  async removeConversationTag(businessId, conversationId, tag) {
    const result = await this.pool.query(
      'UPDATE conversations SET tags = array_remove(tags, $1), updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING *',
      [tag, conversationId, businessId]
    );
    if (!result.rows[0]) return null;
    const conv = result.rows[0];
    return {
      ...conv,
      visitor: conv.visitor,
      messages: conv.messages,
      status: conv.status,
      leadId: conv.lead_id,
      score: conv.score,
      tags: conv.tags,
      assignee: conv.assignee,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    };
  }

  async assignConversation(businessId, conversationId, assignee) {
    const result = await this.pool.query(
      'UPDATE conversations SET assignee = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING *',
      [assignee, conversationId, businessId]
    );
    if (!result.rows[0]) return null;
    const conv = result.rows[0];
    return {
      ...conv,
      visitor: conv.visitor,
      messages: conv.messages,
      status: conv.status,
      leadId: conv.lead_id,
      score: conv.score,
      tags: conv.tags,
      assignee: conv.assignee,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    };
  }

  async getTriggers(businessId) {
    const result = await this.pool.query('SELECT * FROM triggers WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
    return result.rows.map(t => ({
      ...t,
      conditions: t.conditions,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
  }

  async addTrigger(businessId, triggerData) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const result = await this.pool.query(
      'INSERT INTO triggers (id, business_id, name, type, conditions, message, enabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
      [id, businessId, triggerData.name, triggerData.type || 'time_on_page', JSON.stringify(triggerData.conditions || {}), triggerData.message, true]
    );
    const t = result.rows[0];
    return {
      ...t,
      conditions: t.conditions,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    };
  }

  async updateTrigger(businessId, triggerId, updates) {
    let query = 'UPDATE triggers SET ';
    const params = [];
    let paramIndex = 1;
    if (updates.name) { query += `name = $${paramIndex++}, `; params.push(updates.name); }
    if (updates.type) { query += `type = $${paramIndex++}, `; params.push(updates.type); }
    if (updates.conditions) { query += `conditions = $${paramIndex++}, `; params.push(JSON.stringify(updates.conditions)); }
    if (updates.message) { query += `message = $${paramIndex++}, `; params.push(updates.message); }
    if (typeof updates.enabled !== 'undefined') { query += `enabled = $${paramIndex++}, `; params.push(updates.enabled); }
    query += 'updated_at = NOW() WHERE id = $' + paramIndex++ + ' AND business_id = $' + paramIndex + ' RETURNING *';
    params.push(triggerId, businessId);
    const result = await this.pool.query(query, params);
    if (!result.rows[0]) return null;
    const t = result.rows[0];
    return {
      ...t,
      conditions: t.conditions,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    };
  }

  async deleteTrigger(businessId, triggerId) {
    const result = await this.pool.query('DELETE FROM triggers WHERE id = $1 AND business_id = $2', [triggerId, businessId]);
    return result.rowCount > 0;
  }

  // Conversation Notes methods
  async addConversationNote(businessId, conversationId, noteData) {
    // First get the conversation
    const getResult = await this.pool.query('SELECT * FROM conversations WHERE id = $1 AND business_id = $2', [conversationId, businessId]);
    if (!getResult.rows[0]) return null;

    const conv = getResult.rows[0];
    let notes = conv.notes || [];

    const note = {
      id: require('crypto').randomBytes(16).toString('hex'),
      ...noteData,
      createdAt: new Date().toISOString()
    };
    notes.push(note);

    const updateResult = await this.pool.query(
      'UPDATE conversations SET notes = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING *',
      [JSON.stringify(notes), conversationId, businessId]
    );

    return note;
  }

  async getConversationNotes(businessId, conversationId) {
    const result = await this.pool.query('SELECT notes FROM conversations WHERE id = $1 AND business_id = $2', [conversationId, businessId]);
    if (!result.rows[0]) return [];
    return result.rows[0].notes || [];
  }

  async deleteConversationNote(businessId, conversationId, noteId) {
    // First get the conversation
    const getResult = await this.pool.query('SELECT * FROM conversations WHERE id = $1 AND business_id = $2', [conversationId, businessId]);
    if (!getResult.rows[0]) return false;

    const conv = getResult.rows[0];
    let notes = conv.notes || [];
    const index = notes.findIndex(n => n.id === noteId);
    if (index === -1) return false;

    notes.splice(index, 1);

    await this.pool.query(
      'UPDATE conversations SET notes = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3',
      [JSON.stringify(notes), conversationId, businessId]
    );

    return true;
  }

  // Save method is not needed for Neon, but we'll keep it for compatibility
  save() {
    // No-op for Neon
  }
}

// Factory function to get the right storage
async function getStorage() {
  if (process.env.DATABASE_URL) {
    const storage = new NeonStorage();
    await storage.init();
    console.log('Using Neon (PostgreSQL) storage');
    return storage;
  } else {
    console.log('Using JSON file storage');
    return new JSONStorage();
  }
}

module.exports = getStorage;
