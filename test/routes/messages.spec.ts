import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestApp } from '../helpers/test-setup';
import { messageRoutes } from '../../src/routes/messages';

// Mock database at the top level for proper hoisting
vi.mock('../../src/utils/database', () => ({
  getDatabaseClient: vi.fn(),
  createPrismaClient: vi.fn(),
  withTransaction: vi.fn(),
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string, public code?: string, public constraint?: string) {
      super(message);
      this.name = 'DatabaseError';
    }
  },
}));

// Mock auth middleware at the top level for proper hoisting
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

describe('Message Routes', () => {
  let app: any;
  let mockPrisma: any;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
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
      $transaction: vi.fn().mockImplementation((callback) => callback(mockPrisma)),
      $disconnect: vi.fn().mockResolvedValue(undefined),
    };

    // Setup the mock to return our mock Prisma client
    const database = require('../../src/utils/database');
    database.getDatabaseClient.mockReturnValue(mockPrisma);

    // Create test app
    const testSetup = createTestApp(messageRoutes);
    app = testSetup.app;
  });

  describe('GET /api/v1/threads/:threadId/messages', () => {
    it('should return paginated list of messages for a thread', async () => {
      const threadId = 'thrd123456789012345678901';
      const mockMessages = [
        {
          id: 'msg1234567890123456789012',
          content: 'Test message 1',
          role: 'USER',
          threadId,
          userId: 'user123456789012345678901',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user123456789012345678901',
            name: 'Test User',
            email: 'test@example.com',
            avatarUrl: 'https://example.com/avatar.jpg'
          }
        }
      ];
      
      mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId });
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      mockPrisma.message.count.mockResolvedValue(1);
      
      const response = await app.request(`/api/v1/threads/${threadId}/messages`);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(1);
      expect(body.data.items[0].id).toBe('msg1234567890123456789012');
    });

    it('should return 404 when thread not found', async () => {
      mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/threads/notfnd123456789012345678901/messages');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Thread Not Found');
    });

    it('should handle query parameters for filtering', async () => {
      const threadId = 'thrd123456789012345678901';
      mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId });
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.count.mockResolvedValue(0);
      
      await app.request('/api/v1/threads/thrd123456789012345678901/messages?role=USER&limit=10');
      
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            threadId,
            role: 'USER'
          }),
          take: 11 // limit + 1 for hasMore
        })
      );
    });
  });

  describe('GET /api/v1/messages/:id', () => {
    it('should return a specific message by id', async () => {
      const messageId = 'msg1234567890123456789012';
      const mockMessage = {
        id: messageId,
        content: 'Test message',
        role: 'USER',
        threadId: 'thrd123456789012345678901',
        userId: 'user123456789012345678901',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user123456789012345678901',
          name: 'Test User',
          email: 'test@example.com',
          avatarUrl: 'https://example.com/avatar.jpg'
        },
        files: []
      };
      
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      
      const response = await app.request('/api/v1/messages/msg1234567890123456789012');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(messageId);
    });

    it('should return 404 when message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/messages/notfnd123456789012345678901');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Message Not Found');
    });
  });

  describe('POST /api/v1/threads/:threadId/messages', () => {
    it('should create a new message in a thread', async () => {
      const threadId = 'thrd123456789012345678901';
      const mockThread = { id: threadId };
      const mockMessage = {
        id: 'msg1234567890123456789012',
        content: 'New test message',
        role: 'USER',
        threadId,
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          avatarUrl: 'https://example.com/avatar.jpg'
        }
      };
      
      mockPrisma.thread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      
      const response = await app.request(`/api/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'New test message',
          role: 'USER'
        })
      });
      
      expect(response.status).toBe(201);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('New test message');
    });

    it('should return 404 when thread for new message not found', async () => {
      mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/threads/notfnd123456789012345678901/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'New test message',
          role: 'USER'
        })
      });
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Thread Not Found');
    });
  });

  describe('PUT /api/v1/messages/:id', () => {
    it('should update an existing message', async () => {
      const messageId = 'msg1234567890123456789012';
      const mockMessage = {
        id: messageId,
        content: 'Original message',
        role: 'USER',
        threadId: 'thrd123456789012345678901',
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          avatarUrl: 'https://example.com/avatar.jpg'
        }
      };
      const updatedMessage = { ...mockMessage, content: 'Updated message' };
      
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.update.mockResolvedValue(updatedMessage);

      const response = await app.request(`/api/v1/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Updated message'
        })
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('Updated message');
    });

    it('should return 404 when message to update not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const response = await app.request('/api/v1/messages/notfnd123456789012345678901', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Updated message'
        })
      });

      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Message Not Found');
    });
  });

  describe('DELETE /api/v1/messages/:id', () => {
    it('should delete a message', async () => {
      const messageId = 'msg1234567890123456789012';
      const mockMessage = {
        id: messageId,
        content: 'Message to delete',
        role: 'USER',
        threadId: 'thrd123456789012345678901',
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.delete.mockResolvedValue(mockMessage);

      const response = await app.request(`/api/v1/messages/${messageId}`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
    });

    it('should return 404 when message to delete not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const response = await app.request('/api/v1/messages/notfnd123456789012345678901', {
        method: 'DELETE'
      });

      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Message Not Found');
    });
  });
});