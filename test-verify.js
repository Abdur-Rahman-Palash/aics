// Test script to verify the verification endpoint
const http = require('http');

// Test data
const testBusinessId = '678a5997-624f-46de-ba9b-ed85910bd133';
const testMethod = 'dns';

// First, let's make a login request to get a session cookie
const loginData = JSON.stringify({
  email: 'akash456@gmail.com',
  password: '123456'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

const loginReq = http.request(loginOptions, (loginRes) => {
  let loginBody = '';
  loginRes.on('data', (chunk) => { loginBody += chunk; });
  loginRes.on('end', () => {
    const cookies = loginRes.headers['set-cookie'];
    
    if (!cookies) {
      return;
    }
    
    // Now test the verify endpoint
    const verifyData = JSON.stringify({ method: testMethod });
    const verifyOptions = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/businesses/${testBusinessId}/verify`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(verifyData),
        'Cookie': cookies.join('; ')
      }
    };
    
    const verifyReq = http.request(verifyOptions, (verifyRes) => {
      let verifyBody = '';
      verifyRes.on('data', (chunk) => { verifyBody += chunk; });
      verifyRes.on('end', () => {
        // Response processing removed
      });
    });
    
    verifyReq.on('error', (error) => {
      // Error processing removed
    });
    
    verifyReq.write(verifyData);
    verifyReq.end();
  });
});

loginReq.on('error', (error) => {
  // Error processing removed
});

loginReq.write(loginData);
loginReq.end();
