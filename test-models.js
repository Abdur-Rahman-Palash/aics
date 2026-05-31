const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        console.log('Fetching available models...');
        // Wait, how to list models with this package? Let's check by trying some common ones!
        const testModels = [
            'text-embedding-001',
            'text-embedding-preview-0409',
            'gemini-embedding-exp-03-07',
            'text-embedding-3-small',
            'text-embedding-gecko@003',
            'embedding-001'
        ];
        
        for (const modelName of testModels) {
            try {
                console.log(`Testing model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.embedContent('test');
                console.log(`✅ Success! Embedding size: ${result.embedding.values.length}`);
                console.log('---');
            } catch (err) {
                console.log(`❌ ${modelName} failed: ${err.message}`);
                console.log('---');
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

listModels();
