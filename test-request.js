const https = require('https');

const data = JSON.stringify({
  "title": "Discussion about AI ethics",
  "description": "A detailed discussion about the ethical implications of AI",
  "metadata": {
    "tags": ["ai", "ethics"],
    "priority": "high"
  }
});

const options = {
  hostname: 'dev-experience.rpotential.dev',
  port: 443,
  path: '/api/v1/threads',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cookie': 'rpotential_auth=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDA2NzA0Mjk3MDUxNzYwMDc4ODUiLCJlbWFpbCI6ImNhcmxvc0BycG90ZW50aWFsLmFpIiwibmFtZSI6IkNhcmxvcyBHdWVycmVybyIsImRvbWFpbiI6InJwb3RlbnRpYWwuYWkiLCJpYXQiOjE3NTI2MDg4MDcsImV4cCI6MTc1MjY5NTIwNywiaXNzIjoiYXV0aC5ycG90ZW50aWFsLmRldiJ9.pNLzdKwbbDkvqUR8EVgLrGEwKD5DdZ0ZIYoWD9Uju-g',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(responseData);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
