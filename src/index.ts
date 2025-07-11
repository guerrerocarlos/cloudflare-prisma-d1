import { Hono } from 'hono';
import { PrismaClient } from './generated/prisma/';
import { PrismaD1 } from '@prisma/adapter-d1';
import { getDatabaseClient } from './utils/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getCorrelationId 
} from './utils/response';

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// Health check endpoint
app.get('/health', (c) => {
  return createSuccessResponse({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Basic users endpoint (temporary for testing)
app.get('/users', async (c) => {
  try {
    const prisma = getDatabaseClient(c.env.DB);
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        nick: true,
        role: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    return createSuccessResponse(users, {
      correlation_id: getCorrelationId(c.req.raw)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return createErrorResponse({
      status: 500,
      title: 'Internal Server Error',
      detail: 'Failed to fetch users'
    }, getCorrelationId(c.req.raw));
  }
});

// Basic user creation endpoint (temporary for testing)
app.post('/users', async (c) => {
  try {
    const prisma = getDatabaseClient(c.env.DB);
    
    // Simple user creation for testing
    const body = await c.req.json();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        nick: body.nick,
        role: body.role || 'USER'
      },
      select: {
        id: true,
        email: true,
        name: true,
        nick: true,
        role: true,
        createdAt: true
      }
    });

    return createSuccessResponse(user, {
      correlation_id: getCorrelationId(c.req.raw)
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return createErrorResponse({
      status: 500,
      title: 'Internal Server Error',
      detail: 'Failed to create user'
    }, getCorrelationId(c.req.raw));
  }
});

// 404 handler
app.notFound((c) => {
  return createErrorResponse({
    status: 404,
    title: 'Not Found',
    detail: `The requested endpoint ${c.req.path} was not found`
  }, getCorrelationId(c.req.raw));
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return createErrorResponse({
    status: 500,
    title: 'Internal Server Error',
    detail: 'An unexpected error occurred'
  }, getCorrelationId(c.req.raw));
});

export default app;