// Common test setup utilities
import { vi } from 'vitest';
import { Hono } from 'hono';
import * as database from '../../src/utils/database';

// Type helper for mock functions
export interface MockPrismaFunction {
  mockResolvedValue: (value: any) => MockPrismaFunction;
  mockResolvedValueOnce: (value: any) => MockPrismaFunction;
  mockRejectedValue: (value: any) => MockPrismaFunction;
  mockRejectedValueOnce: (value: any) => MockPrismaFunction;
  mockImplementation: (fn: (...args: any[]) => any) => MockPrismaFunction;
  mockReturnValue: (value: any) => MockPrismaFunction;
  (...args: any[]): Promise<any>;
}

// Create a mock function helper
export function createPrismaMock(): MockPrismaFunction {
  const fn = vi.fn() as any;
  fn.mockResolvedValue = (value: any) => {
    fn.mockImplementation(() => Promise.resolve(value));
    return fn;
  };
  fn.mockResolvedValueOnce = (value: any) => {
    fn.mockImplementationOnce(() => Promise.resolve(value));
    return fn;
  };
  fn.mockRejectedValue = (value: any) => {
    fn.mockImplementation(() => Promise.reject(value));
    return fn;
  };
  fn.mockRejectedValueOnce = (value: any) => {
    fn.mockImplementationOnce(() => Promise.reject(value));
    return fn;
  };
  return fn;
}

// Create a complete Prisma client mock
export function createMockPrismaClient() {
  return {
    user: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
    },
    session: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      delete: createPrismaMock(),
      findMany: createPrismaMock(),
    },
    thread: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
    },
    message: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
    },
    artifact: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
    },
    file: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
    },
    reaction: {
      findMany: createPrismaMock(),
      create: createPrismaMock(),
      delete: createPrismaMock(),
      findUnique: createPrismaMock(),
      findFirst: createPrismaMock(),
    },
    messageFile: {
      create: createPrismaMock(),
      findMany: createPrismaMock(),
    },
    $transaction: vi.fn().mockImplementation((callback) => callback({})),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };
}

// Setup common database mocks
export function setupDatabaseMocks() {
  // Create a single mock client instance to share
  const mockPrismaClient = createMockPrismaClient();
  
  // Mock the database utility module using vi.mock for proper hoisting
  vi.mock('../../src/utils/database', () => ({
    getDatabaseClient: vi.fn().mockReturnValue(mockPrismaClient),
    createPrismaClient: vi.fn().mockReturnValue(mockPrismaClient),
    withTransaction: vi.fn().mockImplementation((prisma, callback) => callback(mockPrismaClient)),
    DatabaseError: class DatabaseError extends Error {
      constructor(message: string, public code?: string, public constraint?: string) {
        super(message);
        this.name = 'DatabaseError';
      }
    },
  }));
  
  return mockPrismaClient;
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
  
  // Return the app and the mock Prisma client
  const mockPrismaClient = createMockPrismaClient();
  
  return {
    app,
    mockEnv,
    mockPrisma: mockPrismaClient
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
