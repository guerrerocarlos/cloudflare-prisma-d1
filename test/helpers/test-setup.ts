// Common test setup utilities

import { Hono } from 'hono';
import { vi } from 'vitest';
import * as database from '../../src/utils/database';
import * as authModule from '../../src/middleware/auth';

// Setup common database mocks
export function setupDatabaseMocks() {
  vi.mock('../../src/utils/database', () => ({
    getDatabaseClient: vi.fn().mockReturnValue({
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
      },
      session: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
      },
      thread: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      message: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
      },
      artifact: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
      },
      file: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
      },
      reaction: {
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(async (callback) => await callback())
    })
  }));
}

// Setup auth middleware mocks
export function setupAuthMocks() {
  vi.mock('../../src/middleware/auth', () => ({
    authenticateUser: vi.fn().mockImplementation(async (c, next) => {
      c.set('authenticatedUser', { 
        id: 'test-user-id', 
        email: 'test@example.com', 
        role: 'USER',
        name: 'Test User',
        nick: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg'
      });
      return await next();
    }),
    requireRole: () => vi.fn().mockImplementation(async (c, next) => {
      return await next();
    }),
    optionalAuth: vi.fn().mockImplementation(async (c, next) => {
      return await next();
    }),
    getCurrentUser: vi.fn().mockReturnValue({ 
      id: 'test-user-id', 
      email: 'test@example.com', 
      role: 'USER',
      name: 'Test User',
      nick: 'testuser',
      avatarUrl: 'https://example.com/avatar.jpg'
    }),
  }));
}

// Create a Hono app with mock environment
export function createTestApp(routes: any) {
  const app = new Hono();
  
  // Create a mock environment with a DB property
  const mockEnv = {
    DB: {} as D1Database
  };
  
  // Add the env to the app
  app.use('*', async (c, next) => {
    c.env = mockEnv;
    await next();
  });
  
  app.route('/api/v1', routes);
  
  // Return the app and the mock DB reference
  return {
    app,
    mockEnv,
    mockPrisma: vi.mocked(database.getDatabaseClient(mockEnv.DB))
  };
}

// Mock crypto and date functions
export function setupCommonMocks() {
  // Mock crypto.randomUUID
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => 'mock-uuid-123');
  
  // Mock Date.now
  const originalDateNow = Date.now;
  Date.now = vi.fn(() => 1625097600000); // Fixed timestamp
  
  return { originalDateNow };
}
