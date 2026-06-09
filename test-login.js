
const http = require('http');

// Function to make HTTP requests with cookies
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ res, body }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function main() {
    // Step 1: Get CSRF token
    console.log('Step 1: Getting CSRF token');
    const csrfOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/csrf-token',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    };
    let { res, body } = await makeRequest(csrfOptions);
    const cookies = res.headers['set-cookie'];
    console.log('Cookies:', cookies);
    const csrfData = JSON.parse(body);
    console.log('CSRF Response:', csrfData);
    const csrfToken = csrfData.csrfToken;

    // Step 2: Login
    console.log('\nStep 2: Logging in');
    const loginData = JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
    });
    const loginOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length,
            'Cookie': cookies.join('; '),
            'X-CSRF-Token': csrfToken
        }
    };
    ({ res, body } = await makeRequest(loginOptions, loginData));
    console.log('Login response:', JSON.parse(body));
}

main().catch(console.error);
