// Unit tests for thread routes

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database utility before any other imports
vi.mock('../../src/utils/database', () => {
  const mockPrismaClient = {
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
      findFirst: vi.fn(),
    },
    messageFile: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((callback) => callback({})),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };

  return {
    getDatabaseClient: vi.fn().mockReturnValue(mockPrismaClient),
    createPrismaClient: vi.fn().mockReturnValue(mockPrismaClient),
    withTransaction: vi.fn().mockImplementation((prisma, callback) => callback(mockPrismaClient)),
    DatabaseError: class DatabaseError extends Error {
      constructor(message: string, public code?: string, public constraint?: string) {
        super(message);
        this.name = 'DatabaseError';
      }
    },
  };
});

// Mock the auth middleware
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

import { threadRoutes } from '../../src/routes/threads';
import { getDatabaseClient } from '../../src/utils/database';
import { Hono } from 'hono';

describe('Thread Routes', () => {
  let app: Hono;
  let mockPrisma: any;

  beforeEach(() => {
    // Mock crypto.randomUUID
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => 'mock-uuid-123');
    
    // Mock Date.now
    Date.now = vi.fn(() => 1625097600000); // Fixed timestamp
    
    // Create a test app with the thread routes
    app = new Hono();
    
    // Create a mock environment with a DB property
    const mockEnv = {
      DB: {} as D1Database
    };
    
    // Add the env to the app
    app.use('*', async (c, next) => {
      c.env = mockEnv;
      await next();
    });
    
    app.route('/api/v1', threadRoutes);
    
    // Get the mocked prisma client
    mockPrisma = getDatabaseClient();
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/v1/threads', () => {
    it('should return paginated list of threads', async () => {
      const mockThreads = [
        { 
          id: 'thread1', 
          title: 'Thread One', 
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {},
          user: {
            id: 'user1',
            email: 'user1@example.com',
            name: 'User One',
            nick: 'user1',
            avatarUrl: 'https://example.com/avatar1.jpg'
          }
        },
        { 
          id: 'thread2', 
          title: 'Thread Two', 
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {},
          user: {
            id: 'user2',
            email: 'user2@example.com',
            name: 'User Two',
            nick: 'user2',
            avatarUrl: 'https://example.com/avatar2.jpg'
          }
        }
      ];
      
      mockPrisma.thread.findMany.mockResolvedValue(mockThreads);
      
      const response = await app.request('/api/v1/threads');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockThreads);
      expect(mockPrisma.thread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          select: expect.objectContaining({
            id: true,
            title: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            metadata: true
          }),
          take: expect.any(Number),
          orderBy: expect.any(Object)
        })
      );
    });
    
    it('should handle pagination parameters', async () => {
      mockPrisma.thread.findMany.mockResolvedValue([]);
      
      await app.request('/api/v1/threads?page=2&limit=10');
      
      expect(mockPrisma.thread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 11, // limit + 1 for hasMore check
          orderBy: expect.any(Object)
        })
      );
    });
  });

  describe('GET /api/v1/threads/:id', () => {
    it('should return a specific thread by id', async () => {
      const mockThread = {
        id: 'thread1',
        title: 'Thread One',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {}
      };
      
      mockPrisma.thread.findUnique.mockResolvedValue(mockThread);
      
      const response = await app.request('/api/v1/threads/thread1');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockThread);
      expect(mockPrisma.thread.findUnique).toHaveBeenCalledWith({
        where: { id: 'thread1' }
      });
    });
    
    it('should return 404 when thread not found', async () => {
      mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/threads/nonexistent');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Not Found');
    });
  });

  describe('POST /api/v1/threads', () => {
    it('should create a new thread', async () => {
      const newThread = {
        title: 'New Thread'
      };
      
      const createdThread = {
        id: 'new-thread-id',
        title: 'New Thread',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {}
      };
      
      mockPrisma.thread.create.mockResolvedValue(createdThread);
      
      const response = await app.request('/api/v1/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newThread)
      });
      
      expect(response.status).toBe(201);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(createdThread);
      expect(mockPrisma.thread.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Thread'
        })
      });
    });
  });

  describe('GET /api/v1/threads/:id/messages', () => {
    it('should return messages for a thread', async () => {
      const threadId = 'thread1';
      const mockMessages = [
        { 
          id: 'msg1', 
          threadId, 
          content: 'Message 1', 
          createdAt: new Date().toISOString(),
          user: {
            id: 'user1',
            name: 'User One',
            nick: 'user1',
            avatarUrl: 'https://example.com/avatar1.jpg'
          }
        },
        { 
          id: 'msg2', 
          threadId, 
          content: 'Message 2', 
          createdAt: new Date().toISOString(),
          user: {
            id: 'user2',
            name: 'User Two',
            nick: 'user2',
            avatarUrl: 'https://example.com/avatar2.jpg'
          }
        }
      ];
      
      mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId });
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      
      const response = await app.request(`/api/v1/threads/${threadId}/messages`);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockMessages);
    });
    
    it('should return 404 when thread not found', async () => {
      mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/threads/nonexistent/messages');
      
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/threads/:id/artifacts', () => {
    it('should return artifacts for a thread', async () => {
      const threadId = 'thread1';
      const mockArtifacts = [
        { 
          id: 'art1', 
          threadId, 
          type: 'REPORT', 
          title: 'Report 1', 
          createdAt: new Date().toISOString() 
        },
        { 
          id: 'art2', 
          threadId, 
          type: 'DASHBOARD', 
          title: 'Dashboard 1', 
          createdAt: new Date().toISOString() 
        }
      ];
      
      mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId });
      mockPrisma.artifact.findMany.mockResolvedValue(mockArtifacts);
      
      const response = await app.request(`/api/v1/threads/${threadId}/artifacts`);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockArtifacts);
    });
    
    it('should return 404 when thread not found', async () => {
      mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/threads/nonexistent/artifacts');
      
      expect(response.status).toBe(404);
    });
  });
});
