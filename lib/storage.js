const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

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
  async getKnowledgeSourcesForBusiness(businessId) { throw new Error('Not implemented'); }
  
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
  async recordAnalytics(businessId, faqId, aiResolved, humanEscalated) { throw new Error('Not implemented'); }
}

// Original JSON file storage (kept for backward compatibility)
class JSONStorage extends BaseStorage {
  constructor() {
    super();
    this.filePath = path.join(__dirname, '../data.json');
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
  
  async getKnowledgeSourcesForBusiness(businessId) {
    const business = this.data.businesses.find(b => b.id === businessId);
    return business ? business.knowledgeSources : { websites: [], pdfs: [] };
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
  
  // Analytics method
  async recordAnalytics(businessId, faqId, aiResolved, humanEscalated) {
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
        weeklyUsage: []
      };
    }
    
    business.analytics.totalMessages += 1;
    if (aiResolved) business.analytics.aiResolved += 1;
    if (humanEscalated) business.analytics.humanEscalated += 1;
    if (faqId) {
      business.analytics.faqHits[faqId] = (business.analytics.faqHits[faqId] || 0) + 1;
    }
    business.analytics.lastActive = new Date().toISOString();
    business.updatedAt = new Date().toISOString();
    this.save();
    return business.analytics;
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
          analytics JSONB DEFAULT '{"totalMessages":0,"aiResolved":0,"humanEscalated":0,"leadsCaptured":0,"faqHits":{},"lastActive":null,"dailyUsage":[],"weeklyUsage":[]}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
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
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
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
    
    // Get all FAQs, leads, and knowledge sources in single queries
    const [faqsResult, leadsResult, knowledgeSourcesResult] = await Promise.all([
      this.pool.query('SELECT * FROM faqs WHERE business_id = ANY($1)', [businessIds]),
      this.pool.query('SELECT * FROM leads WHERE business_id = ANY($1) ORDER BY created_at DESC', [businessIds]),
      this.pool.query('SELECT * FROM knowledge_sources WHERE business_id = ANY($1)', [businessIds])
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
      knowledgeSources: knowledgeSourcesByBusiness[businessRow.id] || { websites: [], pdfs: [] }
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
    const [faqs, leads, knowledgeSources] = await Promise.all([
      this.getFAQsForBusiness(businessId),
      this.getLeadsForBusiness(businessId),
      this.getKnowledgeSourcesForBusiness(businessId)
    ]);
    
    business.faqs = faqs;
    business.leads = leads;
    business.knowledgeSources = knowledgeSources;
    return business;
  }

  async createBusiness(name, domain, userId) {
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
    const result = await this.pool.query(
      'INSERT INTO faqs (id, business_id, question_en, question_bn, answer_en, answer_bn, is_suggested, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
      [id, businessId, faqData.questionEn, faqData.questionBn, faqData.answerEn, faqData.answerBn, faqData.isSuggested]
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
    let query = 'UPDATE faqs SET ';
    const params = [];
    let paramIndex = 1;
    
    if (updates.questionEn) {
      query += `question_en = $${paramIndex++}, `;
      params.push(updates.questionEn);
    }
    if (updates.questionBn) {
      query += `question_bn = $${paramIndex++}, `;
      params.push(updates.questionBn);
    }
    if (updates.answerEn) {
      query += `answer_en = $${paramIndex++}, `;
      params.push(updates.answerEn);
    }
    if (updates.answerBn) {
      query += `answer_bn = $${paramIndex++}, `;
      params.push(updates.answerBn);
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
    const result = await this.pool.query(
      'INSERT INTO leads (id, business_id, name, email, phone, message, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
      [id, businessId, leadData.name, leadData.email, leadData.phone, leadData.message, leadData.status || 'new']
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
    const setClauses = [];
    const params = [];
    let paramIndex = 1;
    
    if (updates.name) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }
    if (updates.email) {
      setClauses.push(`email = $${paramIndex++}`);
      params.push(updates.email);
    }
    if (updates.phone) {
      setClauses.push(`phone = $${paramIndex++}`);
      params.push(updates.phone);
    }
    if (updates.company) {
      setClauses.push(`company = $${paramIndex++}`);
      params.push(updates.company);
    }
    if (updates.notes) {
      setClauses.push(`notes = $${paramIndex++}`);
      params.push(updates.notes);
    }
    if (updates.message) {
      setClauses.push(`message = $${paramIndex++}`);
      params.push(updates.message);
    }
    if (updates.status) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(updates.status);
    }
    if (updates.score !== undefined) {
      setClauses.push(`score = $${paramIndex++}`);
      params.push(updates.score);
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
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    };
  }
  
  async createConversation(businessId, visitor) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const result = await this.pool.query(
      'INSERT INTO conversations (id, business_id, visitor, messages, status, score, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
      [id, businessId, JSON.stringify(visitor || { name: '', email: '', phone: '' }), JSON.stringify([]), 'open', 0]
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
    const setClauses = [];
    const params = [];
    let paramIndex = 1;
    
    if (updates.visitor) {
      setClauses.push(`visitor = $${paramIndex++}`);
      params.push(JSON.stringify(updates.visitor));
    }
    if (updates.messages) {
      setClauses.push(`messages = $${paramIndex++}`);
      params.push(JSON.stringify(updates.messages));
    }
    if (updates.status) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(updates.status);
    }
    if (updates.leadId) {
      setClauses.push(`lead_id = $${paramIndex++}`);
      params.push(updates.leadId);
    }
    if (updates.score !== undefined) {
      setClauses.push(`score = $${paramIndex++}`);
      params.push(updates.score);
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
    
    const result = await this.pool.query(
      'UPDATE conversations SET messages = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING *',
      [JSON.stringify(messages), conversationId, businessId]
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
    const result = await this.pool.query(
      'INSERT INTO unanswered_questions (id, business_id, question, count, last_asked_at, answered, created_at) VALUES ($1, $2, $3, $4, NOW(), $5, NOW()) RETURNING *',
      [id, businessId, question, 1, false]
    );
    const q = result.rows[0];
    return {
      ...q,
      lastAskedAt: q.last_asked_at,
      createdAt: q.created_at
    };
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
  
  // Analytics method
  async recordAnalytics(businessId, faqId, aiResolved, humanEscalated) {
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
      weeklyUsage: []
    };
    
    analytics.totalMessages += 1;
    if (aiResolved) analytics.aiResolved += 1;
    if (humanEscalated) analytics.humanEscalated += 1;
    if (faqId) {
      analytics.faqHits[faqId] = (analytics.faqHits[faqId] || 0) + 1;
    }
    analytics.lastActive = new Date().toISOString();
    
    await this.pool.query(
      'UPDATE businesses SET analytics = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(analytics), businessId]
    );
    
    return analytics;
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
