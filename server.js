// Simple Express server with Socket.IO for local testing

const express = require('express');
const http = require('http');
const path = require('path');
require('dotenv').config();
const { Server } = require('socket.io');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const getStorage = require('./lib/storage');
const { doubleCsrf } = require('csrf-csrf');
const nodemailer = require('nodemailer');

let storage;

// Email notification function
async function sendLeadNotification(business, lead) {
    if (!business.notificationEmail) {
        console.log('No notification email set for business:', business.name);
        return;
    }

    // Create a transporter using environment variables
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    // Get conversation transcript if available
    let transcript = '';
    if (lead.conversationId) {
        const conversation = business.conversations.find(c => c.id === lead.conversationId);
        if (conversation && conversation.messages) {
            transcript = conversation.messages.map(msg => {
                return `${msg.role.toUpperCase()}: ${msg.content}`;
            }).join('\n\n');
        }
    }

    const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@aics.app',
        to: business.notificationEmail,
        subject: `New Lead from ${business.name}`,
        text: `
Hello!

You have a new lead from your website!

Visitor Information:
Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone}
Message: ${lead.message}

Lead Score: ${lead.score}
Status: ${lead.status}
Received: ${new Date(lead.createdAt).toLocaleString()}

${transcript ? 'Conversation Transcript:\n' + transcript : ''}

Best regards,
AICS Team
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Notification email sent:', info.messageId);
    } catch (error) {
        console.error('Error sending notification email:', error);
    }
}

const chatHandler = require('./api/chat');
const uploadFaqsHandler = require('./api/upload-faqs');
const getFaqsHandler = require('./api/get-faqs');
const businessesHandler = require('./api/businesses');
const businessFaqsHandler = require('./api/businesses/[id]/faqs');
const businessWidgetHandler = require('./api/businesses/[id]/widget');
const businessWebsiteHandler = require('./api/businesses/[id]/website');
const businessPdfHandler = require('./api/businesses/[id]/pdf');
const QdrantManager = require('./lib/qdrant');
const GeminiAI = require('./lib/gemini');

const app = express();
// Trust proxy (for Render HTTPS)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
let server, io;

// Check for default session secret in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-secret-key-change-this-in-production')) {
    console.warn('WARNING: Using default or missing SESSION_SECRET in production! This is a security risk. Please set a strong SESSION_SECRET in your environment variables.');
}

// Initialize CSRF Protection
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    getSessionIdentifier: (req) => req.session?.userId || 'anonymous-' + req.ip,
    cookieName: 'aics-csrf-token',
    cookieOptions: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    },
});

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { success: false, error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// CORS Middleware - allow cross-origin requests from embedded widgets
app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Allow requests from any origin for API endpoints (needed for embedded widget)
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Security Headers
app.use((req, res, next) => {
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Allow framing on same origin
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // CSP - Content Security Policy - Allow cross-origin connections for embedded widget
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.socket.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: wss: ws:; font-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(cookieSession({
    name: 'aics-session',
    keys: [process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production'],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    httpOnly: true,
    secure: isProduction, // Secure only in production (HTTPS)
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site (though we're same-site), 'lax' for local
    path: '/'
}));

// Add CSRF token endpoint with error handling
app.get('/api/csrf-token', (req, res) => {
    try {
        const csrfToken = generateCsrfToken(req, res);
        res.json({ success: true, csrfToken });
    } catch (error) {
        console.error('[CSRF] Error generating CSRF token:', error.message);
        // If CSRF token generation fails, still return success with null token
        res.json({ success: true, csrfToken: null });
    }
});

// Apply CSRF protection to all state-changing routes except /api/chat and public lead endpoints
app.use('/api', (req, res, next) => {
    const isStateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    // Exclude chat, leads, verify, and auth endpoints for now
    const isExcluded = req.path === '/chat' || 
                      req.path.match(/^\/businesses\/[^/]+\/leads$/) ||
                      req.path.match(/^\/businesses\/[^/]+\/verify$/) ||
                      req.path.startsWith('/auth/');
    
    if (!isStateChanging || isExcluded) {
        next();
    } else {
        try {
            const csrfCheckResult = doubleCsrfProtection(req, res, (err) => {
                if (err) {
                    console.error('[CSRF] CSRF validation failed:', {
                        error: err.message || err,
                        status: err.statusCode || 400,
                        code: err.code,
                        stack: err.stack
                    });
                    if (!res.headersSent) {
                        return res.status(err.statusCode || 400).json({ 
                            success: false, 
                            error: 'CSRF validation failed: ' + (err.message || err.code || 'unknown error')
                        });
                    }
                } else {
                    next();
                }
            });
        } catch (error) {
            console.error('[CSRF] Exception in CSRF middleware:', {
                message: error.message,
                stack: error.stack
            });
            if (!res.headersSent) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'CSRF error: ' + error.message 
                });
            }
        }
    }
});

// Auth middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        return res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
    }
}

// Auth API Routes
app.post('/api/auth/signup', authLimiter, async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Validate inputs
        if (!name || name.length < 2) {
            return res.status(400).json({ success: false, error: 'Name must be at least 2 characters long' });
        }
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
        }
        
        const user = await storage.createUser(email, password, name);
        req.session.userId = user.id;
        res.status(201).json({ success: true, user });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate inputs
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
        }
        if (!password) {
            return res.status(400).json({ success: false, error: 'Password is required' });
        }
        
        const user = await storage.loginUser(email, password);
        req.session.userId = user.id;
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(401).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session = null;
    res.clearCookie('aics-session');
    res.status(200).json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Not logged in' });
    }
    const user = storage.getUserById(req.session.userId);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Not logged in' });
    }
    res.status(200).json({ success: true, user });
});

// API Routes
app.post('/api/chat', (req, res) => chatHandler(req, res));
app.post('/api/upload-faqs', (req, res) => uploadFaqsHandler(req, res));
app.get('/api/get-faqs', (req, res) => getFaqsHandler(req, res));
app.all('/api/businesses', (req, res) => businessesHandler(req, res));
app.all('/api/businesses/:id', (req, res) => {
    console.log('[/api/businesses/:id] Hit the route!', req.method, req.params, req.body);
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const { id: businessId } = req.params;
        
        if (req.method === 'GET') {
            const business = storage.getBusiness(businessId, req.session.userId);
            if (!business) {
                return res.status(404).json({ success: false, error: 'Business not found' });
            }
            return res.status(200).json({ success: true, business });
        } else if (req.method === 'PUT') {
            const business = storage.getBusiness(businessId, req.session.userId);
            if (!business) {
                return res.status(404).json({ success: false, error: 'Business not found' });
            }
            const updatedBusiness = storage.updateBusiness(businessId, req.body);
            return res.status(200).json({ success: true, business: updatedBusiness });
        } else if (req.method === 'DELETE') {
            const deleted = storage.deleteBusiness(businessId, req.session.userId);
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Business not found' });
            }
            return res.status(200).json({ success: true });
        } else {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('[/api/businesses/:id] Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
app.all('/api/businesses/:id/faqs', (req, res) => {
    req.query.id = req.params.id;
    businessFaqsHandler(req, res);
});
app.all('/api/businesses/:id/widget', (req, res) => {
    req.query.id = req.params.id;
    businessWidgetHandler(req, res);
});
app.all('/api/businesses/:id/website', (req, res) => {
    req.query.id = req.params.id;
    businessWebsiteHandler(req, res);
});
app.all('/api/businesses/:id/pdf', (req, res) => {
    req.query.id = req.params.id;
    businessPdfHandler(req, res);
});

// Verification endpoint
const verifyHandler = require('./api/businesses/[id]/verify');
app.all('/api/businesses/:id/verify', (req, res) => {
    req.query.id = req.params.id;
    verifyHandler(req, res);
});

// Lead API Routes
app.post('/api/businesses/:id/leads', async (req, res) => {
    try {
        const businessId = req.params.id;
        const business = storage.getBusiness(businessId);
        const newLead = storage.addLead(businessId, req.body);
        if (newLead) {
                // Emit real-time event for new lead
                if (io) {
                    io.emit('new lead', { businessId, lead: newLead });
                }
                // Send email notification
                if (business) {
                    sendLeadNotification(business, newLead);
                }
            res.status(201).json({ success: true, lead: newLead });
        } else {
            res.status(404).json({ success: false, error: 'Business not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.get('/api/businesses/:id/leads', (req, res) => {
    // Check auth
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const businessId = req.params.id;
        // Verify ownership
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const leads = storage.getLeadsForBusiness(businessId);
        res.status(200).json({ success: true, leads });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.put('/api/businesses/:id/leads/:leadId', (req, res) => {
    // Check auth
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const { id: businessId, leadId } = req.params;
        const { status, ...updates } = req.body;
        // Verify ownership
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const updatedLead = storage.updateLead(businessId, leadId, { status, ...updates });
        if (updatedLead) {
                // Emit real-time event for lead status update
                if (io) {
                    io.emit('lead status updated', { businessId, lead: updatedLead });
                }
                res.status(200).json({ success: true, lead: updatedLead });
        } else {
            res.status(404).json({ success: false, error: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Conversations API endpoints
app.get('/api/businesses/:id/conversations', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const businessId = req.params.id;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const conversations = storage.getConversationsForBusiness(businessId);
        res.status(200).json({ success: true, conversations });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.put('/api/businesses/:id/conversations/:conversationId', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const { id: businessId, conversationId } = req.params;
        const updates = req.body;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const updatedConversation = storage.updateConversation(businessId, conversationId, updates);
        if (updatedConversation) {
            res.status(200).json({ success: true, conversation: updatedConversation });
        } else {
            res.status(404).json({ success: false, error: 'Conversation not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.post('/api/businesses/:id/conversations/:conversationId/messages', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const { id: businessId, conversationId } = req.params;
        const { content } = req.body;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const message = storage.addMessageToConversation(businessId, conversationId, {
            role: 'human',
            content
        });
        if (message) {
            io.emit('new message', { businessId, conversationId, message });
            res.status(201).json({ success: true, message });
        } else {
            res.status(404).json({ success: false, error: 'Conversation not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Unanswered Questions API endpoints
app.get('/api/businesses/:id/unanswered-questions', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const businessId = req.params.id;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const questions = storage.getUnansweredQuestions(businessId);
        res.status(200).json({ success: true, questions });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.put('/api/businesses/:id/unanswered-questions/:questionId', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const { id: businessId, questionId } = req.params;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const question = storage.markQuestionAnswered(businessId, questionId);
        if (question) {
            res.status(200).json({ success: true, question });
        } else {
            res.status(404).json({ success: false, error: 'Question not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Webhooks API endpoints
app.get('/api/businesses/:id/webhooks', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const businessId = req.params.id;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const webhooks = storage.getWebhooks(businessId);
        res.status(200).json({ success: true, webhooks });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.post('/api/businesses/:id/webhooks', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const businessId = req.params.id;
        const webhookData = req.body;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const webhook = storage.addWebhook(businessId, webhookData);
        res.status(201).json({ success: true, webhook });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.put('/api/businesses/:id/webhooks/:webhookId', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const { id: businessId, webhookId } = req.params;
        const updates = req.body;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const webhook = storage.updateWebhook(businessId, webhookId, updates);
        if (webhook) {
            res.status(200).json({ success: true, webhook });
        } else {
            res.status(404).json({ success: false, error: 'Webhook not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.delete('/api/businesses/:id/webhooks/:webhookId', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const { id: businessId, webhookId } = req.params;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const deleted = storage.deleteWebhook(businessId, webhookId);
        if (deleted) {
            res.status(200).json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Webhook not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Delete a business
app.delete('/api/businesses/:id', (req, res) => {
    console.log('[DELETE] Business delete request:', {
        businessId: req.params.id,
        hasSession: !!req.session,
        userId: req.session?.userId
    });
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const businessId = req.params.id;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            console.log('[DELETE] Business not found:', businessId);
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        console.log('[DELETE] Deleting business:', businessId);
        const deleted = storage.deleteBusiness(businessId, req.session.userId);
        if (deleted) {
            console.log('[DELETE] Business deleted successfully:', businessId);
            res.status(200).json({ success: true, message: 'Business deleted successfully' });
        } else {
            console.log('[DELETE] Failed to delete business:', businessId);
            res.status(400).json({ success: false, error: 'Failed to delete business' });
        }
    } catch (error) {
        console.error('[DELETE] Error deleting business:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Export CSV endpoint
app.get('/api/businesses/:id/export/:type', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const { id: businessId, type } = req.params;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }

        let csv = '';
        let filename = '';

        if (type === 'leads') {
            filename = 'leads.csv';
            csv = 'id,name,email,phone,company,notes,status,score,createdAt\n';
            (business.leads || []).forEach(lead => {
                csv += `${lead.id},"${lead.name}","${lead.email}","${lead.phone}","${lead.company}","${lead.notes}","${lead.status}",${lead.score},"${lead.createdAt}"\n`;
            });
        } else if (type === 'conversations') {
            filename = 'conversations.csv';
            csv = 'id,visitor_name,visitor_email,visitor_phone,status,score,createdAt,updatedAt\n';
            (business.conversations || []).forEach(conv => {
                csv += `${conv.id},"${conv.visitor?.name}","${conv.visitor?.email}","${conv.visitor?.phone}","${conv.status}",${conv.score},"${conv.createdAt}","${conv.updatedAt}"\n`;
            });
        } else {
            return res.status(400).json({ success: false, error: 'Invalid export type' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Update business settings
app.put('/api/businesses/:id/settings', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const { id: businessId } = req.params;
        const { notificationEmail } = req.body;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        business.notificationEmail = notificationEmail;
        storage.save();
        res.status(200).json({ success: true, business });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});



// Google Sheets API endpoints
app.get('/api/businesses/:id/google-sheets', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const businessId = req.params.id;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        // Don't return service account key for security
        const googleSheets = {
            enabled: business.googleSheets?.enabled || false,
            spreadsheetId: business.googleSheets?.spreadsheetId || ''
        };
        res.status(200).json({ success: true, googleSheets });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.put('/api/businesses/:id/google-sheets', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const businessId = req.params.id;
        const { enabled, spreadsheetId, serviceAccountKey } = req.body;
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        business.googleSheets = {
            ...business.googleSheets,
            enabled: enabled ?? business.googleSheets.enabled,
            spreadsheetId: spreadsheetId ?? business.googleSheets.spreadsheetId,
            serviceAccountKey: serviceAccountKey ?? business.googleSheets.serviceAccountKey
        };
        storage.save();
        res.status(200).json({ success: true, googleSheets: { enabled: business.googleSheets.enabled, spreadsheetId: business.googleSheets.spreadsheetId } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});



// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 404 handler for API routes - return JSON before static file handler
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found', path: req.path, method: req.method });
});

// Serve static files (css, js, etc.)
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use(express.static(path.join(__dirname, 'public')));

async function startServer() {
    storage = await getStorage();
    
    server = http.createServer(app);
    io = new Server(server, {
        cors: {
            origin: "*", // Allow all origins for Socket.IO (or restrict to your domain)
            methods: ["GET", "POST"],
            credentials: true
        }
    });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    socket.on('send message', async (userMessage) => {
      try {
        // Initialize services
        const QdrantManager = require('./lib/qdrant');
        const GeminiAI = require('./lib/gemini');
        const qdrant = new QdrantManager();
        const gemini = new GeminiAI();

        // Generate embedding for user message
        const queryEmbedding = await gemini.generateEmbedding(userMessage);

        // Search Qdrant for similar FAQs
        const similarFAQs = await qdrant.searchSimilar(queryEmbedding);

        // Build context from similar FAQs
        let context = 'No FAQ context available.';
        if (similarFAQs.length > 0) {
          context = similarFAQs.map(faq => 
            `Q: ${faq.question}\nA: ${faq.answer}`
          ).join('\n\n');
        }

        // Generate AI response
        const aiResponse = await gemini.generateResponse(userMessage, context);

        // Emit AI response back to client
        socket.emit('ai response', aiResponse);

      } catch (error) {
        socket.emit('ai response', 'Sorry, something went wrong. Please try again.');
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
