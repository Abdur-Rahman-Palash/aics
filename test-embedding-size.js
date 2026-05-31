const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testEmbeddingSize() {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
        const result = await model.embedContent('Hello world!');
        console.log('Embedding size:', result.embedding.values.length);
        console.log('Embedding:', result.embedding.values.slice(0, 10), '...');
    } catch (err) {
        console.error('Error testing embedding:', err);
    }
}

testEmbeddingSize();
