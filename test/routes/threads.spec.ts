// Unit tests for thread routes

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { threadRoutes } from '../../src/routes/threads';
import { setupDatabaseMocks, setupAuthMocks, createTestApp, setupCommonMocks } from '../helpers/test-setup';

// Setup mocks
setupDatabaseMocks();
setupAuthMocks();

describe('Thread Routes', () => {
  let testContext: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    // Setup common mocks (crypto, Date, etc.)
    setupCommonMocks();
    
    // Create a test app with the thread routes
    testContext = createTestApp(threadRoutes);
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/v1/threads', () => {
    it('should return paginated list of threads for current user', async () => {
      const mockThreads = [
        { id: 'thread1', title: 'Thread One', userId: 'test-user-id', createdAt: new Date().toISOString() },
        { id: 'thread2', title: 'Thread Two', userId: 'test-user-id', createdAt: new Date().toISOString() }
      ];
      
      testContext.mockPrisma.thread.findMany.mockResolvedValue(mockThreads);
      
      const response = await testContext.app.request('/api/v1/threads');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockThreads);
      expect(testContext.mockPrisma.thread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', trashed: false }
        })
      );
    });
    
    it('should handle pagination parameters', async () => {
      testContext.mockPrisma.thread.findMany.mockResolvedValue([]);
      
      await testContext.app.request('/api/v1/threads?page=2&limit=10');
      
      expect(testContext.mockPrisma.thread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      );
    });
  });

  describe('GET /api/v1/threads/:id', () => {
    it('should return a specific thread by id', async () => {
      const mockThread = {
        id: 'thread1',
        title: 'Thread One',
        userId: 'test-user-id',
        createdAt: new Date().toISOString()
      };
      
      testContext.mockPrisma.thread.findUnique.mockResolvedValue(mockThread);
      
      const response = await testContext.app.request('/api/v1/threads/thread1');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockThread);
      expect(testContext.mockPrisma.thread.findUnique).toHaveBeenCalledWith({
        where: { id: 'thread1' }
      });
    });
    
    it('should return 404 when thread not found', async () => {
      testContext.mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await testContext.app.request('/api/v1/threads/nonexistent');
      
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
        ...newThread,
        userId: 'test-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trashed: false
      };
      
      testContext.mockPrisma.thread.create.mockResolvedValue(createdThread);
      
      const response = await testContext.app.request('/api/v1/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newThread)
      });
      
      expect(response.status).toBe(201);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(createdThread);
      expect(testContext.mockPrisma.thread.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...newThread,
          userId: 'test-user-id'
        })
      });
    });
  });

  describe('PUT /api/v1/threads/:id', () => {
    it('should update an existing thread', async () => {
      const threadId = 'thread-to-update';
      const updateData = {
        title: 'Updated Thread Title'
      };
      
      const updatedThread = {
        id: threadId,
        ...updateData,
        userId: 'test-user-id',
        updatedAt: new Date().toISOString()
      };
      
      testContext.mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId, userId: 'test-user-id' });
      testContext.mockPrisma.thread.update.mockResolvedValue(updatedThread);
      
      const response = await testContext.app.request(`/api/v1/threads/${threadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(updatedThread);
      expect(testContext.mockPrisma.thread.update).toHaveBeenCalledWith({
        where: { id: threadId },
        data: expect.objectContaining(updateData)
      });
    });
    
    it('should return 404 when thread to update not found', async () => {
      testContext.mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await testContext.app.request('/api/v1/threads/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' })
      });
      
      expect(response.status).toBe(404);
    });
    
    it('should prevent updating a thread owned by another user', async () => {
      testContext.mockPrisma.thread.findUnique.mockResolvedValue({ 
        id: 'other-users-thread', 
        userId: 'different-user-id' 
      });
      
      const response = await testContext.app.request('/api/v1/threads/other-users-thread', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Trying to update' })
      });
      
      expect(response.status).toBe(403);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Forbidden');
    });
  });

  describe('DELETE /api/v1/threads/:id', () => {
    it('should mark a thread as trashed', async () => {
      const threadId = 'thread-to-delete';
      const mockThread = { id: threadId, userId: 'test-user-id' };
      const trashedThread = { ...mockThread, trashed: true };
      
      testContext.mockPrisma.thread.findUnique.mockResolvedValue(mockThread);
      testContext.mockPrisma.thread.update.mockResolvedValue(trashedThread);
      
      const response = await testContext.app.request(`/api/v1/threads/${threadId}`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(testContext.mockPrisma.thread.update).toHaveBeenCalledWith({
        where: { id: threadId },
        data: { trashed: true }
      });
    });
    
    it('should return 404 when thread to delete not found', async () => {
      testContext.mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await testContext.app.request('/api/v1/threads/nonexistent', {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(404);
    });
    
    it('should prevent deleting a thread owned by another user', async () => {
      testContext.mockPrisma.thread.findUnique.mockResolvedValue({ 
        id: 'other-users-thread', 
        userId: 'different-user-id' 
      });
      
      const response = await testContext.app.request('/api/v1/threads/other-users-thread', {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/threads/:id/messages', () => {
    it('should return messages for a thread', async () => {
      const threadId = 'thread1';
      const mockMessages = [
        { id: 'msg1', threadId, content: 'Message 1', createdAt: new Date().toISOString() },
        { id: 'msg2', threadId, content: 'Message 2', createdAt: new Date().toISOString() }
      ];
      
      testContext.mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId, userId: 'test-user-id' });
      testContext.mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      
      const response = await testContext.app.request(`/api/v1/threads/${threadId}/messages`);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockMessages);
      expect(testContext.mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { threadId }
        })
      );
    });
    
    it('should return 404 when thread not found', async () => {
      testContext.mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await testContext.app.request('/api/v1/threads/nonexistent/messages');
      
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/threads/:id/artifacts', () => {
    it('should return artifacts for a thread', async () => {
      const threadId = 'thread1';
      const mockArtifacts = [
        { id: 'art1', threadId, type: 'REPORT', title: 'Report 1', createdAt: new Date().toISOString() },
        { id: 'art2', threadId, type: 'DASHBOARD', title: 'Dashboard 1', createdAt: new Date().toISOString() }
      ];
      
      testContext.mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId, userId: 'test-user-id' });
      testContext.mockPrisma.artifact.findMany.mockResolvedValue(mockArtifacts);
      
      const response = await testContext.app.request(`/api/v1/threads/${threadId}/artifacts`);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockArtifacts);
      expect(testContext.mockPrisma.artifact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { threadId }
        })
      );
    });
    
    it('should return 404 when thread not found', async () => {
      testContext.mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await testContext.app.request('/api/v1/threads/nonexistent/artifacts');
      
      expect(response.status).toBe(404);
    });
  });
});
