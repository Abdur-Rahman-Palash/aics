const fs = require('fs');
const path = require('path');

// Abstract base storage class
class BaseStorage {
  // Users
  async getUser(email) { throw new Error('Not implemented'); }
  async createUser(userData) { throw new Error('Not implemented'); }
  
  // Businesses
  async getBusinessesForUser(userId) { throw new Error('Not implemented'); }
  async getBusiness(businessId, userId = null) { throw new Error('Not implemented'); }
  async createBusiness(name, domain, userId) { throw new Error('Not implemented'); }
  async updateWidgetSettings(businessId, settings) { throw new Error('Not implemented'); }
  async updateVerification(businessId, verificationData) { throw new Error('Not implemented'); }
  
  // FAQs
  async getFAQsForBusiness(businessId) { throw new Error('Not implemented'); }
  async addFAQ(businessId, faqData) { throw new Error('Not implemented'); }
  async updateFAQ(businessId, faqId, updates) { throw new Error('Not implemented'); }
  async deleteFAQ(businessId, faqId) { throw new Error('Not implemented'); }
  
  // Leads
  async getLeadsForBusiness(businessId) { throw new Error('Not implemented'); }
  async addLead(businessId, leadData) { throw new Error('Not implemented'); }
  async updateLeadStatus(businessId, leadId, status) { throw new Error('Not implemented'); }
  
  // Knowledge sources
  async addWebsite(businessId, url) { throw new Error('Not implemented'); }
  async addPdf(businessId, originalName, filename) { throw new Error('Not implemented'); }
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

  async createUser(userData) {
    this.data.users.push(userData);
    this.save();
    return userData;
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
  }

  // Users methods
  async getUser(email) {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async createUser(userData) {
    const result = await this.pool.query(
      'INSERT INTO users (id, email, password, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [userData.id, userData.email, userData.password, userData.name]
    );
    return result.rows[0];
  }

  // Businesses methods
  async getBusinessesForUser(userId) {
    const result = await this.pool.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
    return result.rows;
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
    
    // Load FAQs, knowledge sources, and leads for the business
    const business = result.rows[0];
    business.faqs = await this.getFAQsForBusiness(businessId);
    business.leads = await this.getLeadsForBusiness(businessId);
    business.knowledgeSources = await this.getKnowledgeSourcesForBusiness(businessId);
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
    return result.rows[0];
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
    return result.rows[0];
  }

  // FAQs methods
  async getFAQsForBusiness(businessId) {
    const result = await this.pool.query('SELECT * FROM faqs WHERE business_id = $1', [businessId]);
    return result.rows;
  }

  async addFAQ(businessId, faqData) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const result = await this.pool.query(
      'INSERT INTO faqs (id, business_id, question_en, question_bn, answer_en, answer_bn, is_suggested, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
      [id, businessId, faqData.questionEn, faqData.questionBn, faqData.answerEn, faqData.answerBn, faqData.isSuggested]
    );
    return result.rows[0];
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
    return result.rows[0];
  }

  async deleteFAQ(businessId, faqId) {
    const result = await this.pool.query('DELETE FROM faqs WHERE id = $1 AND business_id = $2', [faqId, businessId]);
    return result.rowCount > 0;
  }

  // Leads methods
  async getLeadsForBusiness(businessId) {
    const result = await this.pool.query('SELECT * FROM leads WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
    return result.rows;
  }

  async addLead(businessId, leadData) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const result = await this.pool.query(
      'INSERT INTO leads (id, business_id, name, email, phone, message, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
      [id, businessId, leadData.name, leadData.email, leadData.phone, leadData.message, leadData.status || 'new']
    );
    return result.rows[0];
  }

  async updateLeadStatus(businessId, leadId, status) {
    const result = await this.pool.query(
      'UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING *',
      [status, leadId, businessId]
    );
    return result.rows[0];
  }

  // Knowledge sources methods
  async getKnowledgeSourcesForBusiness(businessId) {
    const result = await this.pool.query('SELECT * FROM knowledge_sources WHERE business_id = $1', [businessId]);
    const websites = [];
    const pdfs = [];
    result.rows.forEach(ks => {
      if (ks.type === 'website') {
        websites.push(ks);
      } else {
        pdfs.push(ks);
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
    return result.rows[0];
  }

  async addPdf(businessId, originalName, filename) {
    const id = require('crypto').randomBytes(16).toString('hex');
    const result = await this.pool.query(
      'INSERT INTO knowledge_sources (id, business_id, type, original_name, filename, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
      [id, businessId, 'pdf', originalName, filename, 'pending']
    );
    return result.rows[0];
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
