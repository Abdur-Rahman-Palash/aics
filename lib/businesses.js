// Business Management Library for AICS
// Simple JSON-based storage for businesses (can be replaced with real DB later)
const fs = require('fs');
const path = require('path');

const BUSINESS_FILE = path.join(__dirname, '..', 'data', 'businesses.json');
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BUSINESS_FILE)) fs.writeFileSync(BUSINESS_FILE, JSON.stringify([], null, 2));

class BusinessManager {
    static getBusinesses() {
        try {
            const data = fs.readFileSync(BUSINESS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            return [];
        }
    }
    static getBusiness(id) {
        return this.getBusinesses().find(b => b.id === id);
    }
    static createBusiness(name, domain) {
        const crypto = require('crypto');
        const businesses = this.getBusinesses();
        const newBusiness = {
            id: crypto.randomUUID(),
            name,
            domain,
            createdAt: new Date().toISOString(),
            qdrantCollection: `aics_${name.toLowerCase().replace(/\s+/g, '_')}`,
            analytics: {
                totalMessages: 0,
                faqHits: {},
                lastActive: new Date().toISOString()
            }
        };
        businesses.push(newBusiness);
        fs.writeFileSync(BUSINESS_FILE, JSON.stringify(businesses, null, 2));
        return newBusiness;
    }
    static updateAnalytics(businessId, faqHitId = null) {
        const businesses = this.getBusinesses();
        const business = businesses.find(b => b.id === businessId);
        if (business) {
            business.analytics.totalMessages++;
            business.analytics.lastActive = new Date().toISOString();
            if (faqHitId) {
                if (!business.analytics.faqHits[faqHitId]) business.analytics.faqHits[faqHitId] = 0;
                business.analytics.faqHits[faqHitId]++;
            }
            fs.writeFileSync(BUSINESS_FILE, JSON.stringify(businesses, null, 2));
        }
        return business;
    }
}

module.exports = BusinessManager;
