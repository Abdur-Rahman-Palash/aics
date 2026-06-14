const http = require('http');

async function testAll() {
  console.log('--- Starting verification tests ---');
  
  const loginData = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });

  const cookies = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          resolve(setCookie);
        } else {
          reject(new Error('Login failed: ' + body));
        }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
  
  console.log('[Test] Logged in successfully. Cookie obtained.');

  // Get CSRF Token
  const csrfData = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/csrf-token',
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    }, (res) => {
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        cookies.push(...setCookie);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });
    req.end();
  });

  const csrfToken = csrfData.csrfToken;
  console.log('[Test] CSRF token obtained:', csrfToken);

  // Get businesses to retrieve a business ID
  const businesses = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/businesses',
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const data = JSON.parse(body);
        resolve(data.businesses || []);
      });
    });
    req.end();
  });

  let businessId;
  if (businesses.length === 0) {
    console.log('[Test] No businesses found. Creating a new business...');
    const createPayload = JSON.stringify({
      name: 'Test Business',
      domain: 'https://testbusiness.com'
    });
    const createResult = await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/businesses',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(createPayload),
          'Cookie': cookies.join('; '),
          'X-CSRF-Token': csrfToken
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve(JSON.parse(body));
        });
      });
      req.write(createPayload);
      req.end();
    });
    
    if (createResult.success && createResult.business) {
      businessId = createResult.business.id;
      console.log(`[Test] Created new business with ID: ${businessId}`);
    } else {
      console.error('[Test] Failed to create business:', createResult);
      return;
    }
  } else {
    businessId = businesses[0].id;
    console.log(`[Test] Using existing business ID: ${businessId}`);
  }

  // Test 2: Add keyword_match trigger
  const triggerPayload = JSON.stringify({
    name: 'Pricing Keyword Trigger',
    type: 'keyword_match',
    conditions: { keywords: 'pricing,cost,payment' },
    message: 'Looking for pricing? Here are our standard and premium plans!'
  });

  const triggerResult = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/businesses/${businessId}/triggers`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(triggerPayload),
        'Cookie': cookies.join('; '),
        'X-CSRF-Token': csrfToken
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });
    req.write(triggerPayload);
    req.end();
  });

  console.log('[Test] Add trigger response:', triggerResult);

  // Test 3: List triggers
  const getTriggersResult = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/businesses/${businessId}/triggers`,
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });
    req.end();
  });

  console.log('[Test] Get triggers response (contains keyword_match?):', 
    getTriggersResult.triggers?.some(t => t.type === 'keyword_match') ? 'YES' : 'NO'
  );

  // Test 4: List agents
  const getAgentsResult = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/businesses/${businessId}/agents`,
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });
    req.end();
  });

  console.log('[Test] Get agents list response:', getAgentsResult);
}

testAll().catch(console.error);
