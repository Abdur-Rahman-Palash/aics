// Simple JSON storage system using lowdb (v7 compatible)
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const bcrypt = require('bcryptjs');

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
                        notificationEmail: business.notificationEmail || '',
                        googleSheets: business.googleSheets || {
                            enabled: false,
                            spreadsheetId: '',
                            serviceAccountKey: ''
                        },
                        verification: business.verification || {
                            status: 'unverified',
                            method: null,
                            token: crypto.randomBytes(16).toString('hex'),
                            verifiedAt: null
                        },
                        faqs: business.faqs || [],
                        knowledgeSources: {
                            websites: business.knowledgeSources?.websites || [],
                            pdfs: business.knowledgeSources?.pdfs || []
                        },
                        leads: business.leads || [],
                        conversations: business.conversations || [],
                        unansweredQuestions: business.unansweredQuestions || [],
                        webhooks: business.webhooks || [],
                        analytics: business.analytics || {
                            totalMessages: 0,
                            aiResolved: 0,
                            humanEscalated: 0,
                            leadsCaptured: 0,
                            faqHits: {},
                            lastActive: new Date().toISOString(),
                            dailyUsage: [],
                            weeklyUsage: []
                        }
                    }))
                };
            }
        } catch (error) {
            // Error loading database
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
            // Error saving database
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
        // Generate verification token
        const verificationToken = crypto.randomBytes(16).toString('hex');
        
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
            notificationEmail: '', // Email to send notifications to
            verification: {
                status: 'unverified', // 'unverified', 'pending', 'verified'
                method: null, // 'dns', 'html'
                token: verificationToken,
                verifiedAt: null
            },
            faqs: [], // Array of { id, questionEn, questionBn, answerEn, answerBn, isSuggested }
            knowledgeSources: {
                websites: [], // Array of { id, url, status, createdAt, lastTrainedAt }
                pdfs: [] // Array of { id, name, fileName, status, createdAt, lastTrainedAt }
            },
            leads: [], // Array of { id, name, email, phone, company, notes, status, score, conversationId, createdAt }
            conversations: [], // Array of { id, visitor: { name, email, phone }, messages: [], status, leadId, score, createdAt, updatedAt }
            unansweredQuestions: [], // Array of { id, question, count, lastAskedAt, answered }
            webhooks: [], // Array of { id, url, events, enabled, createdAt }
            analytics: {
                totalMessages: 0,
                aiResolved: 0,
                humanEscalated: 0,
                leadsCaptured: 0,
                faqHits: {},
                lastActive: new Date().toISOString(),
                dailyUsage: [],
                weeklyUsage: []
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
                // Error creating Qdrant collection
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
                // Error adding FAQ to Qdrant
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
            company: leadData.company || '',
            notes: leadData.notes || leadData.message || '',
            message: leadData.message || '',
            status: 'new', // new, contacted, qualified, converted, lost
            score: this.calculateLeadScore(leadData),
            conversationId: leadData.conversationId || null,
            createdAt: new Date().toISOString()
        };

        if (!business.leads) {
            business.leads = [];
        }
        business.leads.push(newLead);
        business.analytics.leadsCaptured += 1;

        // Update the conversation with leadId and visitor info
        if (leadData.conversationId) {
            const conversation = business.conversations.find(c => c.id === leadData.conversationId);
            if (conversation) {
                conversation.leadId = newLead.id;
                conversation.visitor = {
                    name: newLead.name,
                    email: newLead.email,
                    phone: newLead.phone
                };
                conversation.score = newLead.score;
            }
        }

        // Send to Google Sheets if enabled
        if (business.googleSheets && business.googleSheets.enabled) {
            const GoogleSheetsCRM = require('./google-sheets');
            const gSheets = new GoogleSheetsCRM();
            if (gSheets.init(business.googleSheets.serviceAccountKey)) {
                (async () => {
                    await gSheets.addLead(business.googleSheets.spreadsheetId, newLead);
                })();
            }
        }

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


    // Update widget settings
    updateWidgetSettings(businessId, settings) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        business.widgetSettings = { ...business.widgetSettings, ...settings };
        this.save();
        
        return business.widgetSettings;
    }
    
    // Update verification status
    updateVerification(businessId, verificationData) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        business.verification = { ...business.verification, ...verificationData };
        this.save();
        
        return business.verification;
    }

    // ========== CONVERSATION FUNCTIONS ==========
    createConversation(businessId, visitor = {}) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const newConversation = {
            id: crypto.randomUUID(),
            visitor: {
                name: visitor.name || '',
                email: visitor.email || '',
                phone: visitor.phone || ''
            },
            messages: [],
            status: 'open', // open, pending, closed
            leadId: null,
            score: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        business.conversations.push(newConversation);
        this.save();
        return newConversation;
    }

    getConversation(businessId, conversationId) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        return business.conversations.find(c => c.id === conversationId);
    }

    getConversationsForBusiness(businessId) {
        const business = this.getBusiness(businessId);
        if (!business) return [];
        return business.conversations;
    }

    addMessageToConversation(businessId, conversationId, message) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const conversation = business.conversations.find(c => c.id === conversationId);
        if (!conversation) return null;
        
        const newMessage = {
            id: crypto.randomUUID(),
            role: message.role, // user, ai, human
            content: message.content,
            confidence: message.confidence || null,
            timestamp: new Date().toISOString()
        };
        
        conversation.messages.push(newMessage);
        conversation.updatedAt = new Date().toISOString();
        this.save();
        return newMessage;
    }

    updateConversation(businessId, conversationId, updates) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const conversationIndex = business.conversations.findIndex(c => c.id === conversationId);
        if (conversationIndex === -1) return null;
        
        business.conversations[conversationIndex] = {
            ...business.conversations[conversationIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.save();
        return business.conversations[conversationIndex];
    }

    // ========== UNANSWERED QUESTION FUNCTIONS ==========
    addUnansweredQuestion(businessId, question) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const normalizedQuestion = question.toLowerCase().trim();
        let existingQuestion = business.unansweredQuestions.find(q => 
            q.question.toLowerCase().trim() === normalizedQuestion
        );
        
        if (existingQuestion) {
            existingQuestion.count += 1;
            existingQuestion.lastAskedAt = new Date().toISOString();
        } else {
            existingQuestion = {
                id: crypto.randomUUID(),
                question,
                count: 1,
                lastAskedAt: new Date().toISOString(),
                answered: false
            };
            business.unansweredQuestions.push(existingQuestion);
        }
        
        this.save();
        return existingQuestion;
    }

    getUnansweredQuestions(businessId) {
        const business = this.getBusiness(businessId);
        if (!business) return [];
        return business.unansweredQuestions.sort((a, b) => b.count - a.count);
    }

    markQuestionAnswered(businessId, questionId) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const question = business.unansweredQuestions.find(q => q.id === questionId);
        if (!question) return null;
        
        question.answered = true;
        this.save();
        return question;
    }

    calculateLeadScore(leadData) {
        let score = 0;
        
        const highValueKeywords = ['pricing', 'demo', 'quote', 'enterprise', 'consultation', 'purchase', 'integration'];
        const message = (leadData.message || '').toLowerCase();
        
        highValueKeywords.forEach(keyword => {
            if (message.includes(keyword)) score += 20;
        });
        
        if (leadData.email) score += 15;
        if (leadData.phone) score += 15;
        if (leadData.name) score += 10;
        if (leadData.company) score += 15;
        
        return Math.min(score, 100);
    }

    updateLead(businessId, leadId, updates) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const leadIndex = business.leads.findIndex(l => l.id === leadId);
        if (leadIndex === -1) return null;
        
        business.leads[leadIndex] = { ...business.leads[leadIndex], ...updates };
        if (updates.name || updates.email || updates.phone || updates.company || updates.message) {
            business.leads[leadIndex].score = this.calculateLeadScore(business.leads[leadIndex]);
        }
        
        this.save();
        return business.leads[leadIndex];
    }

    // ========== ENHANCED ANALYTICS FUNCTIONS ==========
    recordAnalytics(businessId, faqId = null, isAIResolved = true, isHumanEscalated = false) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        business.analytics.totalMessages++;
        if (isAIResolved) business.analytics.aiResolved++;
        if (isHumanEscalated) business.analytics.humanEscalated++;
        if (faqId) {
            if (!business.analytics.faqHits[faqId]) business.analytics.faqHits[faqId] = 0;
            business.analytics.faqHits[faqId]++;
        }
        
        const today = new Date().toISOString().split('T')[0];
        let dailyEntry = business.analytics.dailyUsage.find(d => d.date === today);
        if (!dailyEntry) {
            dailyEntry = { date: today, messages: 0, leads: 0 };
            business.analytics.dailyUsage.push(dailyEntry);
        }
        dailyEntry.messages++;
        
        business.analytics.lastActive = new Date().toISOString();
        
        this.save();
        return business.analytics;
    }

    // ========== WEBHOOK FUNCTIONS ==========
    addWebhook(businessId, webhookData) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const newWebhook = {
            id: crypto.randomUUID(),
            url: webhookData.url,
            events: webhookData.events || [],
            enabled: true,
            createdAt: new Date().toISOString()
        };
        
        business.webhooks.push(newWebhook);
        this.save();
        return newWebhook;
    }

    getWebhooks(businessId) {
        const business = this.getBusiness(businessId);
        if (!business) return [];
        return business.webhooks;
    }

    updateWebhook(businessId, webhookId, updates) {
        const business = this.getBusiness(businessId);
        if (!business) return null;
        
        const webhookIndex = business.webhooks.findIndex(w => w.id === webhookId);
        if (webhookIndex === -1) return null;
        
        business.webhooks[webhookIndex] = { ...business.webhooks[webhookIndex], ...updates };
        this.save();
        return business.webhooks[webhookIndex];
    }

    deleteWebhook(businessId, webhookId) {
        const business = this.getBusiness(businessId);
        if (!business) return false;
        
        business.webhooks = business.webhooks.filter(w => w.id !== webhookId);
        this.save();
        return true;
    }

    deleteBusiness(businessId, userId) {
        const businessIndex = this.data.businesses.findIndex(b => b.id === businessId && b.userId === userId);
        if (businessIndex === -1) return false;
        
        const business = this.data.businesses[businessIndex];
        
        // Delete Qdrant collection
        const QdrantManager = require('./qdrant');
        (async () => {
            try {
                const qdrant = new QdrantManager();
                await qdrant.deleteCollection(business.qdrantCollection);
            } catch (err) {
                console.error('Error deleting Qdrant collection:', err.message);
            }
        })();
        
        // Remove from businesses array
        this.data.businesses.splice(businessIndex, 1);
        this.save();
        return true;
    }
}

module.exports = new Storage();
