// Unit tests for message routes

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { messageRoutes } from '../../src/routes/messages';
import * as database from '../../src/utils/database';

// Mock the database client
vi.mock('../../src/utils/database', () => ({
  getDatabaseClient: () => ({
    message: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    thread: {
      findUnique: vi.fn(),
    },
    file: {
      findMany: vi.fn(),
    }
  })
}));

// Mock the auth middleware
vi.mock('../../src/middleware/auth', () => ({
  authenticateUser: vi.fn((c) => {
    c.set('user', { id: 'test-user-id', email: 'test@example.com', role: 'USER' });
    return c.next();
  }),
  requireRole: () => vi.fn((c) => c.next()),
}));

describe('Message Routes', () => {
  let app: Hono;
  let mockPrisma: any;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/v1', messageRoutes);
    
    // Get mock reference for assertions
    mockPrisma = vi.mocked(database.getDatabaseClient(undefined as any));
    
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
      mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId });
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      
      const response = await app.request(`/api/v1/threads/${threadId}/messages`);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockMessages);
      expect(mockPrisma.message.findMany).toHaveBeenCalled();
    });
    
    it('should return 404 when thread not found', async () => {
      mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/threads/nonexistent/messages');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Thread Not Found');
    });
    
    it('should handle query parameters for filtering', async () => {
      mockPrisma.thread.findUnique.mockResolvedValue({ id: 'test-thread-id' });
      mockPrisma.message.findMany.mockResolvedValue([]);
      
      await app.request('/api/v1/threads/test-thread-id/messages?role=USER&limit=10');
      
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
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
      
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      
      const response = await app.request('/api/v1/messages/msg1');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockMessage);
      expect(mockPrisma.message.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'msg1' }
        })
      );
    });
    
    it('should return 404 when message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/messages/nonexistent');
      
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
      mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId });
      mockPrisma.message.create.mockResolvedValue(createdMessage);
      
      const response = await app.request(`/api/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage)
      });
      
      expect(response.status).toBe(201);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(createdMessage);
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...newMessage,
          threadId
        })
      });
    });
    
    it('should return 404 when thread for new message not found', async () => {
      mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/threads/nonexistent/messages', {
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
      const messageId = 'msg-to-update';
      const updateData = {
        content: 'Updated content',
        blocks: [{ type: 'paragraph', content: 'Updated' }]
      };
      
      const updatedMessage = {
        id: messageId,
        role: 'USER',
        ...updateData,
        threadId: 'thread1',
        updatedAt: new Date().toISOString()
      };
      
      mockPrisma.message.findUnique.mockResolvedValue({ id: messageId });
      mockPrisma.message.update.mockResolvedValue(updatedMessage);
      
      const response = await app.request(`/api/v1/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(updatedMessage);
      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: expect.objectContaining(updateData)
      });
    });
    
    it('should return 404 when message to update not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/messages/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated' })
      });
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/messages/:id', () => {
    it('should delete a message', async () => {
      const messageId = 'msg-to-delete';
      const mockMessage = { id: messageId, content: 'Delete me' };
      
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.delete.mockResolvedValue(mockMessage);
      
      const response = await app.request(`/api/v1/messages/${messageId}`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(mockPrisma.message.delete).toHaveBeenCalledWith({
        where: { id: messageId }
      });
    });
    
    it('should return 404 when message to delete not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/messages/nonexistent', {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(404);
    });
  });
});
