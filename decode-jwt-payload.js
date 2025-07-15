// Decode JWT payload to inspect it
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDA2NzA0Mjk3MDUxNzYwMDc4ODUiLCJlbWFpbCI6ImNhcmxvc0BycG90ZW50aWFsLmFpIiwibmFtZSI6IkNhcmxvcyBHdWVycmVybyIsImRvbWFpbiI6InJwb3RlbnRpYWwuYWkiLCJpYXQiOjE3NTI2MDg4MDcsImV4cCI6MTc1MjY5NTIwNywiaXNzIjoiYXV0aC5ycG90ZW50aWFsLmRldiJ9.pNLzdKwbbDkvqUR8EVgLrGEwKD5DdZ0ZIYoWD9Uju-g';

function base64UrlDecode(str) {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4);
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // Decode
  return atob(str);
}

const [header, payload, signature] = token.split('.');

console.log('Header:', JSON.parse(base64UrlDecode(header)));
console.log('Payload:', JSON.parse(base64UrlDecode(payload)));
console.log('Signature:', signature);

// Check expiration
const decodedPayload = JSON.parse(base64UrlDecode(payload));
const now = Math.floor(Date.now() / 1000);
console.log('\nCurrent time:', now);
console.log('Token expires at:', decodedPayload.exp);
console.log('Token is valid:', decodedPayload.exp > now);
console.log('Issued at:', new Date(decodedPayload.iat * 1000).toISOString());
console.log('Expires at:', new Date(decodedPayload.exp * 1000).toISOString());
