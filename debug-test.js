// Quick debug test to see the actual response
import { threadRoutes } from './src/routes/threads.js';
import { Hono } from 'hono';

const app = new Hono();
const mockEnv = { DB: {} };

app.use('*', async (c, next) => {
  c.env = mockEnv;
  await next();
});

app.route('/api/v1', threadRoutes);

// Test with a simple CUID
const threadId = 'clqaaaaaaaaaaaaaaaaaaaaaa';
const response = await app.request(`/api/v1/threads/${threadId}`);
console.log('Status:', response.status);
console.log('Body:', await response.text());
