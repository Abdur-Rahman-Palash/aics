
require('dotenv').config();
const getStorage = require('./lib/storage');
const QdrantManager = require('./lib/qdrant');
const HuggingFaceAI = require('./lib/huggingface');

async function test() {
  try {
    const storage = await getStorage();
    const qdrant = new QdrantManager();
    const gemini = new HuggingFaceAI();

    // Let's get all businesses
    const businesses = await storage.getBusinessesForUser('test-user-id'); // We'll need a real user ID, but let's see if there are any
    console.log('Businesses:', businesses);

    if (businesses.length > 0) {
      const business = businesses[0];
      console.log('Using business:', business.id);
      console.log('Qdrant collection:', business.qdrantCollection);

      // Test search
      const queryEmbedding = await gemini.generateEmbedding('I want to create an invoice');
      const similarItems = await qdrant.searchSimilar(queryEmbedding, 10, business.qdrantCollection);
      console.log('Similar items:', JSON.stringify(similarItems, null, 2));

      // Test classification
      const contextParts = [];
      for (const item of similarItems) {
        if (item.type === 'faq' && item.question && item.answer) {
          contextParts.push(`FAQ - Q: ${item.question}\nA: ${item.answer}`);
        } else if (item.content) {
          contextParts.push(`[${item.type}] Source: ${item.source || 'Unknown'}\n${item.content}`);
        }
      }
      console.log('Context parts:', contextParts);

      if (contextParts.length > 0) {
        const isRelated = await gemini.classifyQuestionRelevance('I want to create an invoice', contextParts);
        console.log('Is related?', isRelated);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

test();
