const http = require('http');

const postData = JSON.stringify({
    message: "Hello, how are you?"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/chat',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        // Response handling
    });
});

req.on('error', (e) => {
    // Error handling
});

req.write(postData);
req.end();
