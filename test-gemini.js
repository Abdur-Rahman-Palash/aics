
const GeminiAI = require('./lib/gemini');
const config = require('./lib/config');
require('dotenv').config();

console.log('Testing GeminiAI...');
console.log('Config:', {
    geminiApiKeySet: !!config.gemini.apiKey,
    qdrantUrlSet: !!config.qdrant.url,
    qdrantApiKeySet: !!config.qdrant.apiKey
});

async function test() {
    try {
        const gemini = new GeminiAI();
        
        console.log('Testing generateEmbedding...');
        const embedding = await gemini.generateEmbedding('Hello world');
        console.log('✅ Embedding generated, size:', embedding.length);
        
        console.log('Testing generateResponse...');
        const response = await gemini.generateResponse('Hi, how are you?', 'No context');
        console.log('✅ Response:', response);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

test();
