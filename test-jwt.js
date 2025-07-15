// Simple script to generate a JWT token for testing
const crypto = require('crypto');

// JWT implementation for testing
function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function createJWT(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64URLEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64URLEncode(Buffer.from(JSON.stringify(payload)));
  
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest();
  const encodedSignature = base64URLEncode(signature);
  
  return `${data}.${encodedSignature}`;
}

// Create a test JWT token
const payload = {
  sub: 'cmcz7s2aw0000350dur6nkmg0', // User ID from database
  email: 'carlos@rpotential.dev',
  name: 'Carlos Rodriguez',
  domain: 'rpotential.dev',
  role: 'USER',
  exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
  iat: Math.floor(Date.now() / 1000)
};

const secret = 'your-jwt-secret-key'; // Default JWT secret
const token = createJWT(payload, secret);

console.log('JWT Token:');
console.log(token);
console.log('\nCurl command with cookie:');
console.log(`curl -X POST http://localhost:8787/api/v1/threads \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -H "Cookie: rpotential_auth=${token}" \\
  -d '{"title": "Test Thread", "description": "This should work with auth"}'`);
