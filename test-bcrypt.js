
const bcrypt = require('bcryptjs');

const hash = '$2b$10$d6MGfzfu7cn4B1MlEQuXWucbLZi.vQiKKLEOqoj/j0ZQOkrC/AH.i';
const password = 'password123';

bcrypt.compare(password, hash, (err, result) => {
    if (err) {
        console.error('Error comparing:', err);
    } else {
        console.log('Result:', result);
    }
});

// Also test sync
console.log('Sync compare:', bcrypt.compareSync(password, hash));
