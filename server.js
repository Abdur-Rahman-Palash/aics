// Simple Express server with Socket.IO for local testing

const express = require('express');
const http = require('http');
const path = require('path');
require('dotenv').config();
const { Server } = require('socket.io');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const storage = require('./lib/storage');

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
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Auth middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        return res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
    }
}

// Auth API Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
        }
        const user = await storage.createUser(email, password, name);
        req.session.userId = user.id;
        res.status(201).json({ success: true, user });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }
        const user = await storage.loginUser(email, password);
        req.session.userId = user.id;
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Failed to log out' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true });
    });
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

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('send message', async (userMessage) => {
        console.log('Received message from user:', userMessage);

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
            console.error('Error handling message:', error);
            socket.emit('ai response', 'Sorry, something went wrong. Please try again.');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
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
    console.log(`AICS Server running at http://localhost:${PORT}`);
    console.log(`Demo: http://localhost:${PORT}/`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
});
