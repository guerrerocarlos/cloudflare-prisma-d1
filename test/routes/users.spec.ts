// Unit tests for user routes

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

import { userRoutes } from '../../src/routes/users';
import { getDatabaseClient } from '../../src/utils/database';
import { authenticateUser, requireRole } from '../../src/middleware/auth';

// Create mock Prisma client
function createMockPrismaClient() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
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

describe('User Routes', () => {
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
    
    app.route('/api/v1', userRoutes);
    
    // Create fresh mock Prisma client
    mockPrisma = createMockPrismaClient();
    
    // Setup database mock
    vi.mocked(getDatabaseClient).mockReturnValue(mockPrisma as any);
    
    // Setup auth middleware mocks - pass auth for most tests
    vi.mocked(authenticateUser).mockImplementation(async (c, next) => {
      c.set('authenticatedUser', {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'ADMIN', // Make test user admin for all user operations
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

  describe('GET /api/v1/users', () => {
    it('should return paginated list of users', async () => {
      const mockUsers = [
        { id: 'user1', name: 'User One', email: 'user1@example.com', role: 'USER' },
        { id: 'user2', name: 'User Two', email: 'user2@example.com', role: 'ADMIN' }
      ];
      
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      
      const response = await app.request('/api/v1/users');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });
    
    it('should handle query parameters for pagination', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      
      await app.request('/api/v1/users?page=2&limit=10');
      
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      );
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return a specific user by id', async () => {
      const mockUser = {
        id: 'user1',
        name: 'User One',
        email: 'user1@example.com',
        role: 'USER'
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      const response = await app.request('/api/v1/users/user1');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' }
      });
    });
    
    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/users/nonexistent');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Not Found');
    });
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@example.com',
        role: 'USER'
      };
      
      const createdUser = {
        id: 'new-user-id',
        ...newUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mockPrisma.user.create.mockResolvedValue(createdUser);
      
      const response = await app.request('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      expect(response.status).toBe(201);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(createdUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining(newUser)
      });
    });
    
    // Add tests for validation errors here
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should update an existing user', async () => {
      const userId = 'user-to-update';
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };
      
      const updatedUser = {
        id: userId,
        ...updateData,
        role: 'USER',
        updatedAt: new Date().toISOString()
      };
      
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.user.update.mockResolvedValue(updatedUser);
      
      const response = await app.request(`/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining(updateData)
      });
    });
    
    it('should return 404 when user to update not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/users/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' })
      });
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete a user', async () => {
      const userId = 'user-to-delete';
      const mockUser = { id: userId, name: 'Delete Me' };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.delete.mockResolvedValue(mockUser);
      
      const response = await app.request(`/api/v1/users/${userId}`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId }
      });
    });
    
    it('should return 404 when user to delete not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/users/nonexistent', {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(404);
    });
  });
});
