require('dotenv').config();
const fetch = require('node-fetch');

async function testUpload() {
    const testFaqs = [
        { question: "What are your business hours?", answer: "9 AM - 6 PM EST" },
        { question: "Do you offer refunds?", answer: "Yes, within 30 days" }
    ];

    try {
        const response = await fetch('http://localhost:3000/api/upload-faqs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ faqs: testFaqs })
        });

        const data = await response.json();
        // Upload response
    } catch (error) {
        // Error in test upload
    }
}

testUpload();