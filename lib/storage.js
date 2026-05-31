// Simple JSON storage system using lowdb (v7 compatible)
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Simple JSON storage without lowdb to avoid compatibility issues
class Storage {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'db.json');
        this.data = this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const content = fs.readFileSync(this.dbPath, 'utf8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.error('Error loading database:', error);
        }
        return { businesses: [] };
    }

    save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Error saving database:', error);
        }
    }

    // Get all businesses
    getAllBusinesses() {
        return this.data.businesses;
    }

    // Get single business by ID
    getBusiness(id) {
        return this.data.businesses.find(b => b.id === id);
    }

    // Get single business by domain
    getBusinessByDomain(domain) {
        return this.data.businesses.find(b => b.domain === domain);
    }

    // Create new business
    createBusiness(name, domain) {
        const newBusiness = {
            id: crypto.randomUUID(),
            name,
            domain,
            createdAt: new Date().toISOString(),
            qdrantCollection: `aics_${name.toLowerCase().replace(/\s+/g, '_')}`,
            widgetSettings: {
                title: `${name} Support`,
                primaryColor: '#667eea',
                avatar: '🤖'
            },
            faqs: [], // Array of { id, questionEn, questionBn, answerEn, answerBn, isSuggested }
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
