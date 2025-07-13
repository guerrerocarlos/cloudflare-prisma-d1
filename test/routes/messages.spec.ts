// Unit tests for message routes

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { Hono } from 'hono';

// Mock the database module before importing the routes
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

// Mock the auth middleware module  
vi.mock('../../src/middleware/auth', () => ({
  authenticateUser: vi.fn(),
  requireRole: vi.fn(),
  optionalAuth: vi.fn(),
  getCurrentUser: vi.fn(),
}));

import { messageRoutes } from '../../src/routes/messages';
import { getDatabaseClient } from '../../src/utils/database';
import { authenticateUser } from '../../src/middleware/auth';

// Create mock Prisma client
function createMockPrismaClient() {
  return {
    message: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    thread: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    messageFile: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  };
}

describe('Message Routes', () => {
  let app: Hono;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    // Create test app
    app = new Hono();
    
    // Add middleware to set up the environment
    app.use('*', async (c, next) => {
      c.env = { DB: {} as D1Database } as any;
      await next();
    });
    
    app.route('/api/v1', messageRoutes);
    
    // Create fresh mock Prisma client
    mockPrisma = createMockPrismaClient();
    
    // Setup database mock
    vi.mocked(getDatabaseClient).mockReturnValue(mockPrisma as any);
    
    // Setup auth middleware mocks
    vi.mocked(authenticateUser).mockImplementation(async (c, next) => {
      c.set('authenticatedUser', {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'USER',
        name: 'Test User',
        nick: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      await next();
      return undefined;
    });
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/v1/threads/:threadId/messages', () => {
    it('should return paginated list of messages for a thread', async () => {
      const threadId = 'test-thread-id';
      const mockMessages = [
        { 
          id: 'msg1', 
          threadId, 
          role: 'USER', 
          content: 'Test message 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        },
        { 
          id: 'msg2', 
          threadId, 
          role: 'ASSISTANT', 
          content: 'Test message 2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        }
      ];
      
      // Mock thread existence
      testContext.mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId });
      testContext.mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      
      const response = await testContext.app.request(`/api/v1/threads/${threadId}/messages`);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockMessages);
      expect(testContext.mockPrisma.message.findMany).toHaveBeenCalled();
    });
    
    it('should return 404 when thread not found', async () => {
      testContext.mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await testContext.app.request('/api/v1/threads/nonexistent/messages');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Thread Not Found');
    });
    
    it('should handle query parameters for filtering', async () => {
      testContext.mockPrisma.thread.findUnique.mockResolvedValue({ id: 'test-thread-id' });
      testContext.mockPrisma.message.findMany.mockResolvedValue([]);
      
      await testContext.app.request('/api/v1/threads/test-thread-id/messages?role=USER&limit=10');
      
      expect(testContext.mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            threadId: 'test-thread-id',
            role: 'USER'
          }),
          take: 11 // limit + 1 for pagination check
        })
      );
    });
  });

  describe('GET /api/v1/messages/:id', () => {
    it('should return a specific message by id', async () => {
      const mockMessage = {
        id: 'msg1',
        role: 'USER',
        content: 'Test message',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thread: { id: 'thread1', status: 'ACTIVE' }
      };
      
      testContext.mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      
      const response = await testContext.app.request('/api/v1/messages/msg1');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockMessage);
      expect(testContext.mockPrisma.message.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'msg1' }
        })
      );
    });
    
    it('should return 404 when message not found', async () => {
      testContext.mockPrisma.message.findUnique.mockResolvedValue(null);
      
      const response = await testContext.app.request('/api/v1/messages/nonexistent');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Not Found');
    });
  });

  describe('POST /api/v1/threads/:threadId/messages', () => {
    it('should create a new message in a thread', async () => {
      const threadId = 'test-thread-id';
      const newMessage = {
        role: 'USER',
        content: 'New message content',
        blocks: [{ type: 'paragraph', content: 'Test' }],
        metadata: { source: 'web' }
      };
      
      const createdMessage = {
        id: 'new-msg-id',
        threadId,
        ...newMessage,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Mock thread existence
      testContext.mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId });
      testContext.mockPrisma.message.create.mockResolvedValue(createdMessage);
      
      const response = await testContext.app.request(`/api/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage)
      });
      
      expect(response.status).toBe(201);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(createdMessage);
      expect(testContext.mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...newMessage,
          threadId
        })
      });
    });
    
    it('should return 404 when thread for new message not found', async () => {
      testContext.mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await testContext.app.request('/api/v1/threads/nonexistent/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'USER',
          content: 'Test content'
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
      const messageId = 'test-message-id';
      const updateData = {
        content: 'Updated content'
      };

      const updatedMessage = {
        id: messageId,
        content: updateData.content,
        updatedAt: new Date().toISOString()
      };

      testContext.mockPrisma.message.findUnique.mockResolvedValue({ id: messageId });
      testContext.mockPrisma.message.update.mockResolvedValue(updatedMessage);

      const response = await testContext.app.request(`/api/v1/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(updatedMessage);
    });

    it('should return 404 when message to update not found', async () => {
      testContext.mockPrisma.message.findUnique.mockResolvedValue(null);

      const response = await testContext.app.request('/api/v1/messages/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated content' })
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/messages/:id', () => {
    it('should delete a message', async () => {
      const messageId = 'test-message-id';
      testContext.mockPrisma.message.findUnique.mockResolvedValue({ id: messageId });
      testContext.mockPrisma.message.delete.mockResolvedValue({ id: messageId });

      const response = await testContext.app.request(`/api/v1/messages/${messageId}`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
    });

    it('should return 404 when message to delete not found', async () => {
      testContext.mockPrisma.message.findUnique.mockResolvedValue(null);

      const response = await testContext.app.request('/api/v1/messages/nonexistent', {
        method: 'DELETE'
      });

      expect(response.status).toBe(404);
    });
  });
});