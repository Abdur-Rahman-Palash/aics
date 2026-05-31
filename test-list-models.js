require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function listAvailableModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        const modelsList = data.models.map(model => ({
            name: model.name,
            displayName: model.displayName,
            supportedGenerationMethods: model.supportedGenerationMethods
        }));
        const outputPath = path.join(__dirname, 'available-models.json');
        fs.writeFileSync(outputPath, JSON.stringify(modelsList, null, 2));
        console.log('Available models written to:', outputPath);
    } catch (err) {
        console.error('Error listing models:', err);
    }
}

listAvailableModels();
