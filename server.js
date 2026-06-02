// Simple Express server with Socket.IO for local testing

const express = require('express');
const http = require('http');
const path = require('path');
require('dotenv').config();
const { Server } = require('socket.io');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const storage = require('./lib/storage');
const { doubleCsrf } = require('csrf-csrf');

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
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for Socket.IO (or restrict to your domain)
        methods: ["GET", "POST"],
        credentials: true
    }
});
const PORT = process.env.PORT || 3000;

// Check for default session secret in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-secret-key-change-this-in-production')) {
    console.warn('WARNING: Using default or missing SESSION_SECRET in production! This is a security risk. Please set a strong SESSION_SECRET in your environment variables.');
}

// Initialize CSRF Protection
const { generateToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
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

// Security Headers
app.use((req, res, next) => {
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // CSP - Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.socket.io; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://cdn.socket.io ws://localhost:3000 wss://localhost:3000; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
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
        const csrfToken = generateToken(req, res);
        res.json({ success: true, csrfToken });
    } catch (error) {
        console.error('Error generating CSRF token:', error);
        // If CSRF token generation fails, still return success with null token
        res.json({ success: true, csrfToken: null });
    }
});

// Apply CSRF protection to all state-changing routes except /api/chat and public lead endpoints
app.use('/api', (req, res, next) => {
    if (
        ['GET', 'HEAD', 'OPTIONS'].includes(req.method) || 
        req.path === '/chat' || 
        req.path.match(/^\/businesses\/[^/]+\/leads$/)
    ) {
        next();
    } else {
        doubleCsrfProtection(req, res, next);
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
        const newLead = storage.addLead(businessId, req.body);
        if (newLead) {
            // Emit real-time event for new lead
            io.emit('new lead', { businessId, lead: newLead });
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
        const { status } = req.body;
        // Verify ownership
        const business = storage.getBusiness(businessId, req.session.userId);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        const updatedLead = storage.updateLeadStatus(businessId, leadId, status);
        if (updatedLead) {
            // Emit real-time event for lead status update
            io.emit('lead status updated', { businessId, lead: updatedLead });
            res.status(200).json({ success: true, lead: updatedLead });
        } else {
            res.status(404).json({ success: false, error: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    socket.on('send message', async (userMessage) => {
        try {
            // Initialize services
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

// Serve static files (css, js, etc.)
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use(express.static(path.join(__dirname, 'public')));

server.listen(PORT, () => {
});
