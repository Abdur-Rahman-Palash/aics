// Simple Express server with Socket.IO for local testing

const express = require('express');
const http = require('http');
const path = require('path');
require('dotenv').config();
const { Server } = require('socket.io');

const chatHandler = require('./api/chat');
const uploadFaqsHandler = require('./api/upload-faqs');
const getFaqsHandler = require('./api/get-faqs');
const QdrantManager = require('./lib/qdrant');
const GeminiAI = require('./lib/gemini');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.post('/api/chat', (req, res) => chatHandler(req, res));
app.post('/api/upload-faqs', (req, res) => uploadFaqsHandler(req, res));
app.get('/api/get-faqs', (req, res) => getFaqsHandler(req, res));

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
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

server.listen(PORT, () => {
    console.log(`AICS Server running at http://localhost:${PORT}`);
    console.log(`Demo: http://localhost:${PORT}/`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
});
