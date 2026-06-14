require('dotenv').config();
const { crawlWebsite } = require('../lib/training');

async function test() {
    console.log('Testing crawlWebsite on example.com...');
    const pages = await crawlWebsite('https://example.com', 3);
    console.log('Resulting pages:', JSON.stringify(pages, null, 2));
}

test().catch(console.error);
