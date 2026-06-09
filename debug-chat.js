
require('dotenv').config();
const getStorage = require('./lib/storage');
const QdrantManager = require('./lib/qdrant');
const GeminiAI = require('./lib/gemini');

async function main() {
    console.log('=== Starting Debug ===');

    // Step 1: Get storage
    const storage = await getStorage();
    const qdrant = new QdrantManager();
    const gemini = new GeminiAI();

    // Step 2: Get all users and businesses
    const testUser = await storage.getUser('test@example.com');
    console.log('Test user:', testUser);

    if (testUser) {
        const businesses = await storage.getBusinessesForUser(testUser.id);
        console.log('Businesses for user:', JSON.stringify(businesses, null, 2));

        for (const business of businesses) {
            console.log('\n--- Business:', business.name, 'id:', business.id);
            
            // Check knowledge sources
            if (business.knowledgeSources) {
                console.log('Knowledge Sources:', JSON.stringify(business.knowledgeSources, null, 2));
            }

            // Check vector store
            console.log('\n--- Checking vector store collection:', business.qdrantCollection);
            const collection = qdrant.loadCollection(business.qdrantCollection);
            console.log('Vector store contents:', collection.length, 'items');
            console.log('Vector store items:', JSON.stringify(collection, null, 2));

            // Simulate a chat request
            console.log('\n--- Simulating chat request: "I want to create an invoice"');
            
            // Generate embedding for query
            const queryEmbedding = await gemini.generateEmbedding('I want to create an invoice');
            
            // Search similar
            const similarItems = await qdrant.searchSimilar(queryEmbedding, 10, business.qdrantCollection);
            console.log('Similar items found:', similarItems);

            // Check relevance classification
            const contextParts = [];
            for (const item of similarItems) {
                if (item.type === 'faq' && item.question && item.answer) {
                    contextParts.push(`FAQ - Q: ${item.question}\nA: ${item.answer}`);
                } else if (item.content) {
                    contextParts.push(`[${item.type}] Source: ${item.source || 'Unknown'}\n${item.content}`);
                }
            }

            const isRelated = await gemini.classifyQuestionRelevance('I want to create an invoice', contextParts);
            console.log('Classification result:', isRelated);
        }
    }
}

main().catch(console.error);
