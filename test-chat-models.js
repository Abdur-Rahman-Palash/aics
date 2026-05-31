const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testChatModels() {
    const testModels = [
        'gemini-1.0-pro',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest',
        'gemini-pro'
    ];
    
    for (const modelName of testModels) {
        try {
            console.log(`\nTesting chat model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello! Just say "Success!"');
            const response = await result.response;
            console.log(`✅ Success! Response: ${response.text()}`);
        } catch (err) {
            console.log(`❌ ${modelName} failed: ${err.message}`);
        }
    }
}

testChatModels();
