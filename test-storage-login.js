
require('dotenv').config();
const getStorage = require('./lib/storage');

async function main() {
    const storage = await getStorage();
    try {
        const user = await storage.loginUser('test@example.com', 'password123');
        console.log('Storage loginUser result:', user);
    } catch (error) {
        console.error('Storage loginUser error:', error.message, error.stack);
    }
}

main();
