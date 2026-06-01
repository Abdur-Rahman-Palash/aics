const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');
console.log('Your SESSION_SECRET:');
console.log(secret);
