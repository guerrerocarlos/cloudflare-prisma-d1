// Unit tests for file routes

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { fileRoutes } from '../../src/routes/files';
import * as database from '../../src/utils/database';

// Mock the database client
vi.mock('../../src/utils/database', () => ({
  getDatabaseClient: () => ({
    file: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    messageFile: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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

describe('File Routes', () => {
  let app: Hono;
  let mockPrisma: any;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/v1', fileRoutes);
    
    // Get mock reference for assertions
    mockPrisma = vi.mocked(database.getDatabaseClient(undefined as any));
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/v1/files', () => {
    it('should return paginated list of files', async () => {
      const mockFiles = [
        { 
          id: 'file1', 
          filename: 'test1.pdf', 
          originalName: 'original1.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          storageUrl: 'https://storage.example.com/file1.pdf',
          createdAt: new Date().toISOString()
        },
        { 
          id: 'file2', 
          filename: 'test2.jpg', 
          originalName: 'original2.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          storageUrl: 'https://storage.example.com/file2.jpg',
          createdAt: new Date().toISOString()
        }
      ];
      
      mockPrisma.file.findMany.mockResolvedValue(mockFiles);
      
      const response = await app.request('/api/v1/files');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockFiles);
      expect(mockPrisma.file.findMany).toHaveBeenCalled();
    });
    
    it('should handle query parameters for filtering', async () => {
      mockPrisma.file.findMany.mockResolvedValue([]);
      
      await app.request('/api/v1/files?mimeType=image&limit=10');
      
      expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mimeType: { contains: 'image' }
          }),
          take: 11 // limit + 1 for pagination check
        })
      );
    });
  });

  describe('GET /api/v1/files/:id', () => {
    it('should return a specific file by id', async () => {
      const mockFile = {
        id: 'file1',
        filename: 'test1.pdf',
        originalName: 'original1.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageUrl: 'https://storage.example.com/file1.pdf',
        createdAt: new Date().toISOString()
      };
      
      mockPrisma.file.findUnique.mockResolvedValue(mockFile);
      
      const response = await app.request('/api/v1/files/file1');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockFile);
      expect(mockPrisma.file.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file1' }
        })
      );
    });
    
    it('should return 404 when file not found', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/files/nonexistent');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Not Found');
    });
  });

  describe('POST /api/v1/files', () => {
    it('should create a new file entry', async () => {
      const newFile = {
        filename: 'upload1.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageUrl: 'https://storage.example.com/upload1.pdf'
      };
      
      const createdFile = {
        id: 'new-file-id',
        ...newFile,
        createdAt: new Date().toISOString()
      };
      
      mockPrisma.file.create.mockResolvedValue(createdFile);
      
      const response = await app.request('/api/v1/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFile)
      });
      
      expect(response.status).toBe(201);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(createdFile);
      expect(mockPrisma.file.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...newFile,
          uploaderId: 'test-user-id' // From mock auth
        })
      });
    });
  });

  describe('POST /api/v1/files/:id/attach', () => {
    it('should attach a file to a message', async () => {
      const fileId = 'file-to-attach';
      const messageId = 'target-message';
      
      const mockFile = { 
        id: fileId, 
        filename: 'test.pdf',
        mimeType: 'application/pdf'
      };
      
      const mockAttachment = {
        id: 'attachment-id',
        fileId,
        messageId
      };
      
      mockPrisma.file.findUnique.mockResolvedValue(mockFile);
      mockPrisma.messageFile.create.mockResolvedValue(mockAttachment);
      
      const response = await app.request(`/api/v1/files/${fileId}/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId })
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(mockPrisma.messageFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileId,
          messageId
        })
      });
    });
    
    it('should return 404 when file to attach not found', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/files/nonexistent/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: 'some-message' })
      });
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/files/:id', () => {
    it('should delete a file', async () => {
      const fileId = 'file-to-delete';
      const mockFile = { id: fileId, filename: 'delete-me.pdf' };
      
      mockPrisma.file.findUnique.mockResolvedValue(mockFile);
      mockPrisma.file.delete.mockResolvedValue(mockFile);
      
      const response = await app.request(`/api/v1/files/${fileId}`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(mockPrisma.file.delete).toHaveBeenCalledWith({
        where: { id: fileId }
      });
    });
    
    it('should return 404 when file to delete not found', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/files/nonexistent', {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(404);
    });
  });
});
