// Script to generate a JWT token with the correct secret
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

// Create a test JWT token with the provided user ID
const payload = {
  sub: '100670429705176007885', // User ID from the provided JWT
  email: 'carlos@rpotential.ai',
  name: 'Carlos Guerrero',
  domain: 'rpotential.ai',
  role: 'USER',
  exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
  iat: Math.floor(Date.now() / 1000)
};

const secret = 'pqlnmpqlnm'; // Correct JWT secret
const token = createJWT(payload, secret);

console.log('JWT Token with correct secret:');
console.log(token);
console.log('\nCurl command with correct token:');
console.log(`curl -X POST http://localhost:8787/api/v1/threads \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -H "Cookie: rpotential_auth=${token}" \\
  -d '{"title": "Test Thread", "description": "This should work with correct auth"}'`);
