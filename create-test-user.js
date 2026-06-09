
require('dotenv').config();
const getStorage = require('./lib/storage');

async function main() {
    const storage = await getStorage();
    try {
        const user = await storage.createUser('test@example.com', 'password123', 'Test User');
        console.log('Created test user:', user);
    } catch (error) {
        console.log('User might already exist, trying to login:', error.message);
        const user = await storage.loginUser('test@example.com', 'password123');
        console.log('Logged in as:', user);
    }
}

main();
