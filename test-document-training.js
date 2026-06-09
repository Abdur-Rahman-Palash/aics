
require('dotenv').config();
const getStorage = require('./lib/storage');
const { trainDocument } = require('./lib/training');
const QdrantManager = require('./lib/qdrant');
const GeminiAI = require('./lib/gemini');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('=== Starting Document Training Test ===\n');

    // Step 1: Initialize storage, Qdrant, and Gemini
    console.log('Step 1: Initializing storage, Qdrant, and Gemini...');
    const storage = await getStorage();
    const qdrant = new QdrantManager();
    const gemini = new GeminiAI();

    // Step 2: Check if we have a test business and create if needed
    console.log('\nStep 2: Checking for test business...');
    const testUser = await storage.getUser('test@example.com');
    if (!testUser) {
        console.log('Test user not found, creating...');
        await storage.createUser('test@example.com', 'password123', 'Test User');
    }
    const businesses = await storage.getBusinessesForUser((await storage.getUser('test@example.com')).id);
    let testBusiness;
    if (businesses.length === 0) {
        console.log('Creating test business...');
        testBusiness = await storage.createBusiness('Test Business', 'test.com', (await storage.getUser('test@example.com')).id);
    } else {
        testBusiness = businesses[0];
    }
    console.log('Test business:', testBusiness.name, 'ID:', testBusiness.id, 'Qdrant collection:', testBusiness.qdrantCollection);

    // Step 3: Create a test text file to train
    console.log('\nStep 3: Creating test document...');
    const testContent = `Test Document for Invoice Training

1. How to create an invoice?
   - Go to Dashboard
   - Click Invoice module
   - Click 'CREATE' button
   - Fill customer details
   - Add products/services
   - Preview and save

2. How to manage payments?
   - Go to Payments section
   - Track all incoming and outgoing payments
   - Mark invoices as paid/unpaid

3. How to manage products?
   - Go to Store section
   - Add, edit, delete products
   - Set product prices and descriptions
`;
    const testFileName = 'test-invoice-training.txt';
    const testFilePath = path.join(__dirname, 'uploads', testFileName);
    if (!fs.existsSync(path.dirname(testFilePath))) {
        fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    }
    fs.writeFileSync(testFilePath, testContent, 'utf-8');
    console.log('Test file created at:', testFilePath);

    // Step 4: Train the document
    console.log('\nStep 4: Training document...');
    try {
        const result = await trainDocument(testBusiness.id, testFilePath, testFileName, testBusiness.qdrantCollection);
        console.log('✅ Training successful! Chunks count:', result.chunksCount);
    } catch (error) {
        console.error('❌ Training failed:', error.message);
        throw error;
    }

    // Step 5: Verify chunks are in the vector storage
    console.log('\nStep 5: Verifying chunks in vector storage...');
    const collection = qdrant.loadCollection(testBusiness.qdrantCollection);
    console.log('Number of items in vector store:', collection.length);
    console.log('Vector store items:');
    collection.forEach((item, index) => {
        console.log(`  Item ${index+1}: type=${item.payload.type}, source=${item.payload.source}, content snippet=${item.payload.content.substring(0,100)}...`);
    });

    // Step 6: Test semantic search
    console.log('\nStep 6: Testing semantic search with "How to create an invoice?"...');
    const queryEmbedding = await gemini.generateEmbedding('How to create an invoice?');
    const similarItems = await qdrant.searchSimilar(queryEmbedding, 3, testBusiness.qdrantCollection);
    console.log('Search results (top 3):');
    similarItems.forEach((item, index) => {
        console.log(`  Result ${index+1}: score=${item.score.toFixed(5)}, type=${item.type}, source=${item.source}\n    Content: ${item.content.substring(0, 200)}...`);
    });

    // Step 7: Test classification and response generation
    console.log('\nStep 7: Testing question relevance classification...');
    const contextParts = similarItems.map(item => item.content);
    const isRelated = await gemini.classifyQuestionRelevance('How to create an invoice?', contextParts);
    console.log('Is question related?', isRelated);
    if (isRelated) {
        const context = contextParts.join('\n\n---\n\n');
        const response = await gemini.generateResponse('How to create an invoice?', context);
        console.log('AI response:', response);
    }

    console.log('\n=== Test Complete ===');
}

main().catch(console.error);
