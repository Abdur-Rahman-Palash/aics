const storage = require('./lib/storage');
const QdrantManager = require('./lib/qdrant');
const GeminiAI = require('./lib/gemini');
const crypto = require('crypto');

async function syncFaqs() {
    const qdrant = new QdrantManager();
    const gemini = new GeminiAI();

    const businesses = storage.getAllBusinesses();
    for (const business of businesses) {
        console.log(`Processing business: ${business.name} (${business.id})`);

        // Initialize collection
        await qdrant.initCollection(business.qdrantCollection);

        for (const faq of business.faqs) {
            console.log(`  Processing FAQ: ${faq.questionEn || faq.questionBn}`);

            // Add English version
            if (faq.questionEn && faq.answerEn) {
                const textEn = `Q: ${faq.questionEn}\nA: ${faq.answerEn}`;
                const embeddingEn = await gemini.generateEmbedding(textEn);
                
                await qdrant.client.upsert(business.qdrantCollection, {
                    points: [
                        {
                            id: crypto.randomUUID(),
                            vector: embeddingEn,
                            payload: {
                                faqId: faq.id,
                                question: faq.questionEn,
                                answer: faq.answerEn,
                                language: 'en'
                            }
                        }
                    ]
                });
                console.log(`    Added English version to Qdrant`);
            }

            // Add Bangla version
            if (faq.questionBn && faq.answerBn) {
                const textBn = `Q: ${faq.questionBn}\nA: ${faq.answerBn}`;
                const embeddingBn = await gemini.generateEmbedding(textBn);
                
                await qdrant.client.upsert(business.qdrantCollection, {
                    points: [
                        {
                            id: crypto.randomUUID(),
                            vector: embeddingBn,
                            payload: {
                                faqId: faq.id,
                                question: faq.questionBn,
                                answer: faq.answerBn,
                                language: 'bn'
                            }
                        }
                    ]
                });
                console.log(`    Added Bangla version to Qdrant`);
            }
        }
    }

    console.log('Sync complete!');
}

syncFaqs().catch(console.error);
