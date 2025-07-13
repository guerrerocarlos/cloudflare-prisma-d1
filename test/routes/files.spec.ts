// Unit tests for file routes

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

import { fileRoutes } from '../../src/routes/files';
import { getDatabaseClient } from '../../src/utils/database';
import { authenticateUser, requireRole } from '../../src/middleware/auth';

// Create mock Prisma client
function createMockPrismaClient() {
  return {
    file: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    messageFile: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  };
}

// Setup common mocks for crypto, Date, etc.
const originalDateNow = Date.now;

beforeAll(() => {
  // Mock crypto.randomUUID
  const crypto = globalThis as any;
  if (!crypto.crypto) {
    crypto.crypto = {};
  }
  crypto.crypto.randomUUID = vi.fn().mockReturnValue('mock-uuid-123');
  
  // Mock Date.now for consistent timestamps
  Date.now = vi.fn().mockReturnValue(1640995200000); // 2022-01-01
});

afterAll(() => {
  // Restore original functions
  vi.restoreAllMocks();
  Date.now = originalDateNow;
});

describe('File Routes', () => {
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
    
    app.route('/api/v1', fileRoutes);
    
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
    
    vi.mocked(requireRole).mockImplementation(() => {
      return vi.fn().mockImplementation(async (c, next) => {
        await next();
        return undefined;
      });
    });
    
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
