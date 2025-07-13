// Unit tests for artifact routes

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { artifactRoutes } from '../../src/routes/artifacts';
import * as database from '../../src/utils/database';
import { setupDatabaseMocks, setupAuthMocks, createTestApp, setupCommonMocks } from '../helpers/test-setup';

// Setup all mocks
setupDatabaseMocks();
setupAuthMocks();
setupCommonMocks();

describe('Artifact Routes', () => {
  let app: Hono;
  let mockPrisma: any;

  beforeEach(() => {
    const testSetup = createTestApp(artifactRoutes);
    app = testSetup.app;
    mockPrisma = testSetup.mockPrisma;
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/v1/artifacts', () => {
    it('should return paginated list of artifacts', async () => {
      const mockArtifacts = [
        { 
          id: 'artifact1', 
          type: 'DOCUMENT', 
          title: 'Test Document',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        },
        { 
          id: 'artifact2', 
          type: 'IMAGE', 
          title: 'Test Image',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        }
      ];
      
      mockPrisma.artifact.findMany.mockResolvedValue(mockArtifacts);
      
      const response = await app.request('/api/v1/artifacts');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockArtifacts);
      expect(mockPrisma.artifact.findMany).toHaveBeenCalled();
    });
    
    it('should handle query parameters for filtering', async () => {
      mockPrisma.artifact.findMany.mockResolvedValue([]);
      
      await app.request('/api/v1/artifacts?type=DOCUMENT&limit=10');
      
      expect(mockPrisma.artifact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'DOCUMENT'
          }),
          take: 11 // limit + 1 for pagination check
        })
      );
    });
  });

  describe('GET /api/v1/threads/:threadId/artifacts', () => {
    it('should return artifacts for a specific thread', async () => {
      const threadId = 'test-thread-id';
      const mockArtifacts = [
        { id: 'artifact1', threadId, type: 'DOCUMENT', title: 'Thread Document' },
        { id: 'artifact2', threadId, type: 'IMAGE', title: 'Thread Image' }
      ];
      
      // Mock thread existence
      mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId });
      mockPrisma.artifact.findMany.mockResolvedValue(mockArtifacts);
      
      const response = await app.request(`/api/v1/threads/${threadId}/artifacts`);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockArtifacts);
      expect(mockPrisma.artifact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            threadId
          })
        })
      );
    });
    
    it('should return 404 when thread not found', async () => {
      mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/threads/nonexistent/artifacts');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Thread Not Found');
    });
  });

  describe('GET /api/v1/artifacts/:id', () => {
    it('should return a specific artifact by id', async () => {
      const mockArtifact = {
        id: 'artifact1',
        type: 'DOCUMENT',
        title: 'Test Document',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thread: { id: 'thread1', status: 'ACTIVE' }
      };
      
      mockPrisma.artifact.findUnique.mockResolvedValue(mockArtifact);
      
      const response = await app.request('/api/v1/artifacts/artifact1');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockArtifact);
      expect(mockPrisma.artifact.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'artifact1' }
        })
      );
    });
    
    it('should return 404 when artifact not found', async () => {
      mockPrisma.artifact.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/artifacts/nonexistent');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Not Found');
    });
  });

  describe('POST /api/v1/threads/:threadId/artifacts', () => {
    it('should create a new artifact in a thread', async () => {
      const threadId = 'test-thread-id';
      const newArtifact = {
        type: 'DOCUMENT',
        title: 'New Document',
        description: 'Test description',
        metadata: { source: 'web' }
      };
      
      const createdArtifact = {
        id: 'new-artifact-id',
        threadId,
        ...newArtifact,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Mock thread existence
      mockPrisma.thread.findUnique.mockResolvedValue({ id: threadId });
      mockPrisma.artifact.create.mockResolvedValue(createdArtifact);
      
      const response = await app.request(`/api/v1/threads/${threadId}/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArtifact)
      });
      
      expect(response.status).toBe(201);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(createdArtifact);
      expect(mockPrisma.artifact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...newArtifact,
          threadId
        })
      });
    });
    
    it('should return 404 when thread for new artifact not found', async () => {
      mockPrisma.thread.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/threads/nonexistent/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DOCUMENT',
          title: 'Test document'
        })
      });
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Thread Not Found');
    });
  });

  describe('PUT /api/v1/artifacts/:id', () => {
    it('should update an existing artifact', async () => {
      const artifactId = 'artifact-to-update';
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description'
      };
      
      const updatedArtifact = {
        id: artifactId,
        type: 'DOCUMENT',
        ...updateData,
        threadId: 'thread1',
        updatedAt: new Date().toISOString()
      };
      
      mockPrisma.artifact.findUnique.mockResolvedValue({ id: artifactId });
      mockPrisma.artifact.update.mockResolvedValue(updatedArtifact);
      
      const response = await app.request(`/api/v1/artifacts/${artifactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(updatedArtifact);
      expect(mockPrisma.artifact.update).toHaveBeenCalledWith({
        where: { id: artifactId },
        data: expect.objectContaining(updateData)
      });
    });
    
    it('should return 404 when artifact to update not found', async () => {
      mockPrisma.artifact.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/artifacts/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' })
      });
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/artifacts/:id', () => {
    it('should delete an artifact', async () => {
      const artifactId = 'artifact-to-delete';
      const mockArtifact = { id: artifactId, title: 'Delete me' };
      
      mockPrisma.artifact.findUnique.mockResolvedValue(mockArtifact);
      mockPrisma.artifact.delete.mockResolvedValue(mockArtifact);
      
      const response = await app.request(`/api/v1/artifacts/${artifactId}`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(mockPrisma.artifact.delete).toHaveBeenCalledWith({
        where: { id: artifactId }
      });
    });
    
    it('should return 404 when artifact to delete not found', async () => {
      mockPrisma.artifact.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/artifacts/nonexistent', {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(404);
    });
  });
});
