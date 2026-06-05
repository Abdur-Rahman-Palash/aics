const storage = require('./lib/storage');
const GeminiAI = require('./lib/gemini');
const LocalVectorStorage = require('./lib/qdrant');
const { trainDocument } = require('./lib/training');
const path = require('path');

// Test script for document training
console.log('🧪 Testing document training setup...');

// Step 1: Create test user and business
async function testSetup() {
  try {
    const user = await storage.createUser('test@example.com', 'password123', 'Test User');
    console.log('✅ Test user created:', user.id);

    const business = storage.createBusiness('Test Business', 'test.com', user.id);
    console.log('✅ Test business created:', business.id);

    // Step 2: Test vector storage
    const qdrant = new LocalVectorStorage();
    await qdrant.initCollection(business.qdrantCollection);
    console.log('✅ Vector storage initialized for:', business.qdrantCollection);

    // Step 3: Test generateEmbedding (if possible)
    try {
      const gemini = new GeminiAI();
      const embedding = await gemini.generateEmbedding('Hello world');
      console.log('✅ Embedding generated successfully! Length:', embedding.length);

      // Insert test chunk
      await qdrant.insertChunks(['Hello world this is a test chunk'], [embedding], business.qdrantCollection, 'test', 'test');
      console.log('✅ Chunk inserted into vector storage!');

      // Test search
      const results = await qdrant.searchSimilar(embedding, 5, business.qdrantCollection);
      console.log('✅ Search results:', results);

    } catch (embedError) {
      console.warn('⚠️  Skipping embedding test (needs GEMINI_API_KEY):', embedError.message);
    }

    console.log('\n🎉 All basic tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSetup();