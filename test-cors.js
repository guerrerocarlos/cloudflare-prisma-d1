// Test CORS configuration with different origins
const http = require('http');

const testOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://localhost:3000',
  'http://127.0.0.1:3000',
  'https://dev.rpotential.dev',
  'https://app.rpotential.dev',
  'https://malicious-site.com'
];

async function testCORS(origin) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8787,
      path: '/api/v1/me',
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    };

    const req = http.request(options, (res) => {
      const allowOrigin = res.headers['access-control-allow-origin'];
      const allowed = allowOrigin === origin || allowOrigin === '*';
      
      console.log(`Origin: ${origin.padEnd(30)} -> ${allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${allowOrigin || 'not set'})`);
      resolve({ origin, allowed, allowOrigin });
    });

    req.on('error', (error) => {
      console.log(`Origin: ${origin.padEnd(30)} -> ❌ ERROR: ${error.message}`);
      resolve({ origin, allowed: false, error: error.message });
    });

    req.end();
  });
}

async function testAllOrigins() {
  console.log('Testing CORS configuration...\n');
  
  for (const origin of testOrigins) {
    await testCORS(origin);
  }
  
  // Test without origin (should be allowed)
  console.log('\nTesting request without Origin header:');
  await new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8787,
      path: '/api/v1/me',
      method: 'OPTIONS'
    };

    const req = http.request(options, (res) => {
      const allowOrigin = res.headers['access-control-allow-origin'];
      console.log(`No Origin header                -> ${allowOrigin ? '✅ ALLOWED' : '❌ BLOCKED'} (${allowOrigin || 'not set'})`);
      resolve();
    });

    req.on('error', (error) => {
      console.log(`No Origin header                -> ❌ ERROR: ${error.message}`);
      resolve();
    });

    req.end();
  });
}

testAllOrigins();
