const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const filePath = path.join(__dirname, '..', 'uploads', 'test-invoice-training.txt');
    const buf = fs.readFileSync(filePath);
    const b64 = buf.toString('base64');
    const payload = {
      file: {
        name: 'test-invoice-training.txt',
        type: 'text/plain',
        data: 'data:text/plain;base64,' + b64,
        size: buf.length,
      },
      businessId: 'ca4c01657b32d7b2c066473798d2ed99',
    };

    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
