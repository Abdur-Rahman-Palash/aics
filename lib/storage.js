// Simple JSON storage system using lowdb (v7 compatible)
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Simple JSON storage without lowdb to avoid compatibility issues
class Storage {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'db.json');
        this.data = this.load();
    }

    load() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            if (fs.existsSync(this.dbPath)) {
                const content = fs.readFileSync(this.dbPath, 'utf8');
                const loadedData = JSON.parse(content);
                // Ensure users and businesses arrays always exist
                return {
                    users: loadedData.users || [],
                    businesses: (loadedData.businesses || []).map(business => ({
                        ...business,
                        faqs: business.faqs || [],
                        knowledgeSources: {
                            websites: business.knowledgeSources?.websites || [],
                            pdfs: business.knowledgeSources?.pdfs || []
                        },
                        leads: business.leads || [],
                        analytics: business.analytics || {
                            totalMessages: 0,
                            faqHits: {},
                            lastActive: new Date().toISOString()
                        }
                    }))
                };
            }
        } catch (error) {
            console.error('Error loading database:', error);
        }
        return { users: [], businesses: [] };
    }

    // ========== USER FUNCTIONS ==========
    async createUser(email, password, name) {
        // Check if user already exists
        const existingUser = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = {
            id: crypto.randomUUID(),
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            createdAt: new Date().toISOString()
        };

        this.data.users.push(newUser);
        this.save();
        return newUser;
    }

    async loginUser(email, password) {
        const user = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
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

    getUserById(id) {
        const user = this.data.users.find(u => u.id === id);
        if (!user) return null;
        const { password: _, ...safeUser } = user;
        return safeUser;
    }

    save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Error saving database:', error);
        }
    }

    // Get all businesses for a user
    getBusinessesForUser(userId) {
        return this.data.businesses.filter(b => b.userId === userId);
    }

    // Get single business by ID (and check ownership)
    getBusiness(id, userId = null) {
        const business = this.data.businesses.find(b => b.id === id);
        if (userId && business && business.userId !== userId) {
            return null; // Not authorized
        }
        return business;
    }

    // Get single business by domain
    getBusinessByDomain(domain) {
        return this.data.businesses.find(b => b.domain === domain);
    }

    // Create new business
    createBusiness(name, domain, userId) {
        const newBusiness = {
            id: crypto.randomUUID(),
            name,
            domain,
            userId, // Link to user
            createdAt: new Date().toISOString(),
            qdrantCollection: `aics_${name.toLowerCase().replace(/\s+/g, '_')}`,
            widgetSettings: {
                title: `${name} Support`,
                primaryColor: '#667eea',
                avatar: '🤖'
            },
            faqs: [], // Array of { id, questionEn, questionBn, answerEn, answerBn, isSuggested }
            knowledgeSources: {
                websites: [], // Array of { id, url, status, createdAt, lastTrainedAt }
                pdfs: [] // Array of { id, name, fileName, status, createdAt, lastTrainedAt }
            },
            leads: [], // Array of { id, name, email, phone, message, createdAt, status }
            analytics: {
                totalMessages: 0,
                faqHits: {}, // { [faqId]: number }
                lastActive: new Date().toISOString()
            }
        };
        
        this.data.businesses.push(newBusiness);
        this.save();
        
        // Create Qdrant collection for new business
        const QdrantManager = require('./qdrant');
        const qdrant = new QdrantManager();
        (async () => {
            try {
                await qdrant.initCollection(newBusiness.qdrantCollection);
            } catch (err) {
                console.error('Error creating Qdrant collection:', err);
            }
        })();
        
        return newBusiness;
    }

    // Add FAQ to business
    addFAQ(businessId, faq) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const newFAQ = {
            id: crypto.randomUUID(),
            ...faq,
            isSuggested: false,
            createdAt: new Date().toISOString()
        };
        
        business.faqs.push(newFAQ);
        this.save();
        
        // Add to Qdrant
        const QdrantManager = require('./qdrant');
        const GeminiAI = require('./gemini');
        (async () => {
            try {
                const qdrant = new QdrantManager();
                const gemini = new GeminiAI();
                await qdrant.init();
                await qdrant.initCollection(business.qdrantCollection);
                
                // Generate embeddings for both languages
                if (faq.questionEn && faq.answerEn) {
                    const textEn = `Q: ${faq.questionEn}\nA: ${faq.answerEn}`;
                    const embeddingEn = await gemini.generateEmbedding(textEn);
                    
                    await qdrant.client.upsert(business.qdrantCollection, {
                        points: [
                            {
                                id: crypto.randomUUID(),
                                vector: embeddingEn,
                                payload: {
                                    faqId: newFAQ.id,
                                    question: faq.questionEn,
                                    answer: faq.answerEn,
                                    language: 'en'
                                }
                            }
                        ]
                    });
                }
                
                if (faq.questionBn && faq.answerBn) {
                    const textBn = `Q: ${faq.questionBn}\nA: ${faq.answerBn}`;
                    const embeddingBn = await gemini.generateEmbedding(textBn);
                    
                    await qdrant.client.upsert(business.qdrantCollection, {
                        points: [
                            {
                                id: crypto.randomUUID(),
                                vector: embeddingBn,
                                payload: {
                                    faqId: newFAQ.id,
                                    question: faq.questionBn,
                                    answer: faq.answerBn,
                                    language: 'bn'
                                }
                            }
                        ]
                    });
                }
            } catch (err) {
                console.error('Error adding FAQ to Qdrant:', err);
            }
        })();
        
        return newFAQ;
    }

    // Add website to business
    addWebsite(businessId, url) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const newWebsite = {
            id: crypto.randomUUID(),
            url,
            status: 'pending',
            createdAt: new Date().toISOString(),
            lastTrainedAt: null
        };
        
        if (!business.knowledgeSources) {
            business.knowledgeSources = { websites: [], pdfs: [] };
        }
        business.knowledgeSources.websites.push(newWebsite);
        this.save();
        
        return newWebsite;
    }

    // Add PDF to business
    addPdf(businessId, name, fileName) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const newPdf = {
            id: crypto.randomUUID(),
            name,
            fileName,
            status: 'pending',
            createdAt: new Date().toISOString(),
            lastTrainedAt: null
        };
        
        if (!business.knowledgeSources) {
            business.knowledgeSources = { websites: [], pdfs: [] };
        }
        business.knowledgeSources.pdfs.push(newPdf);
        this.save();
        
        return newPdf;
    }

    // ========== LEAD FUNCTIONS ==========
    addLead(businessId, leadData) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const newLead = {
            id: crypto.randomUUID(),
            name: leadData.name || '',
            email: leadData.email || '',
            phone: leadData.phone || '',
            message: leadData.message || '',
            status: 'new', // new, contacted, closed
            createdAt: new Date().toISOString()
        };
        
        if (!business.leads) {
            business.leads = [];
        }
        business.leads.push(newLead);
        this.save();
        
        return newLead;
    }

    getLeadsForBusiness(businessId) {
        const business = this.getBusiness(businessId);
        if (!business) return [];
        return business.leads || [];
    }

    updateLeadStatus(businessId, leadId, status) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const leadIndex = business.leads.findIndex(l => l.id === leadId);
        if (leadIndex === -1) return null;
        
        business.leads[leadIndex].status = status;
        this.save();
        
        return business.leads[leadIndex];
    }

    // Update FAQ
    updateFAQ(businessId, faqId, updatedFields) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const faqIndex = business.faqs.findIndex(f => f.id === faqId);
        if (faqIndex === -1) return null;
        
        business.faqs[faqIndex] = { ...business.faqs[faqIndex], ...updatedFields };
        this.save();
        
        // TODO: Update Qdrant as well
        return business.faqs[faqIndex];
    }

    // Delete FAQ
    deleteFAQ(businessId, faqId) {
        const business = this.getBusiness(businessId);
        if (!business) return false;
        
        business.faqs = business.faqs.filter(f => f.id !== faqId);
        this.save();
        
        // TODO: Delete from Qdrant as well
        return true;
    }

    // Record analytics
    recordAnalytics(businessId, faqId = null) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        business.analytics.totalMessages++;
        business.analytics.lastActive = new Date().toISOString();
        if (faqId) {
            if (!business.analytics.faqHits[faqId]) business.analytics.faqHits[faqId] = 0;
            business.analytics.faqHits[faqId]++;
        }
        
        this.save();
        return business.analytics;
    }

    // Update widget settings
    updateWidgetSettings(businessId, settings) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        business.widgetSettings = { ...business.widgetSettings, ...settings };
        this.save();
        
        return business.widgetSettings;
    }
}

module.exports = new Storage();
