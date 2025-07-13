// Unit tests for auth routes

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

import { authRoutes } from '../../src/routes/auth';
import { getDatabaseClient } from '../../src/utils/database';
import { authenticateUser, getCurrentUser } from '../../src/middleware/auth';

// Create mock Prisma client
function createMockPrismaClient() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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
  crypto.crypto.randomUUID = vi.fn().mockReturnValue('mock-uuid-123-17jhs4w');
  
  // Mock Date.now for consistent timestamps
  Date.now = vi.fn().mockReturnValue(1640995200000); // 2022-01-01
});

afterAll(() => {
  // Restore original functions
  vi.restoreAllMocks();
  Date.now = originalDateNow;
});

describe('Auth Routes', () => {
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
    
    app.route('/api/v1', authRoutes);
    
    // Create fresh mock Prisma client
    mockPrisma = createMockPrismaClient();
    
    // Setup database mock
    vi.mocked(getDatabaseClient).mockReturnValue(mockPrisma as any);
    
    // Setup auth middleware mock - for routes that don't need auth, just call next
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
    
    // Setup getCurrentUser mock
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'USER',
      name: 'Test User',
      nick: 'testuser',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should create a new user when email not found', async () => {
      const loginData = {
        email: 'newuser@example.com',
        name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg'
      };
      
      const createdUser = {
        id: 'new-user-id',
        email: loginData.email,
        name: loginData.name,
        nick: null,
        role: 'USER',
        avatarUrl: loginData.avatarUrl,
        lastLoginAt: new Date()
      };
      
      const sessionToken = 'mock-uuid-123-17jhs4w';
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const createdSession = {
        id: 'session-id',
        userId: createdUser.id,
        token: sessionToken,
        expiresAt
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(createdUser);
      mockPrisma.session.create.mockResolvedValue(createdSession);
      
      const response = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.token).toBe(sessionToken);
      expect(body.data.user.email).toBe(loginData.email);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: loginData.email,
          name: loginData.name,
          role: 'USER'
        })
      });
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });
    
    it('should update existing user when email is found', async () => {
      const loginData = {
        email: 'existing@example.com',
        name: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.jpg'
      };
      
      const existingUser = {
        id: 'existing-user-id',
        email: loginData.email,
        name: 'Original Name',
        nick: 'nickname',
        role: 'USER',
        avatarUrl: 'https://example.com/old-avatar.jpg',
        lastLoginAt: new Date(2023, 0, 1)
      };
      
      const updatedUser = {
        ...existingUser,
        name: loginData.name,
        avatarUrl: loginData.avatarUrl,
        lastLoginAt: new Date()
      };
      
      const sessionToken = 'mock-uuid-123-17jhs4w';
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const createdSession = {
        id: 'session-id',
        userId: existingUser.id,
        token: sessionToken,
        expiresAt
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);
      mockPrisma.session.create.mockResolvedValue(createdSession);
      
      const response = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.token).toBe(sessionToken);
      expect(body.data.user.email).toBe(loginData.email);
      expect(body.data.user.name).toBe(loginData.name);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: expect.objectContaining({
          name: loginData.name,
          avatarUrl: loginData.avatarUrl,
          lastLoginAt: expect.any(Date)
        })
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should invalidate the current session', async () => {
      const mockAuthHeader = 'Bearer test-token';
      const mockSession = { id: 'session-id', token: 'test-token', userId: 'test-user-id' };
      
      // Mock the findUnique session call that would happen in the authenticateUser middleware
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.session.delete.mockResolvedValue(mockSession);
      
      const response = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': mockAuthHeader
        },
        body: JSON.stringify({}) // Empty body to satisfy the schema
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { token: 'test-token' }
      });
    });
    
    it('should handle logout with specific token', async () => {
      const specificToken = 'specific-token-to-logout';
      const mockSession = { id: 'session-id', token: specificToken, userId: 'test-user-id' };
      
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.session.delete.mockResolvedValue(mockSession);
      
      const response = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: specificToken })
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { token: specificToken }
      });
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return the current authenticated user', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        nick: 'testnick',
        avatarUrl: 'https://example.com/avatar.jpg'
      };
      
      vi.mocked(getCurrentUser).mockReturnValue(mockUser);
      
      const response = await app.request('/api/v1/auth/me');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockUser);
    });
  });

  describe('GET /api/v1/auth/sessions', () => {
    it('should return all active sessions for the current user', async () => {
      const mockSessions = [
        { 
          id: 'session1', 
          token: 'token1234567890', 
          createdAt: new Date(2023, 1, 1).toISOString(),
          expiresAt: new Date(2023, 2, 1).toISOString()
        },
        { 
          id: 'session2', 
          token: 'token2345678901', 
          createdAt: new Date(2023, 0, 15).toISOString(),
          expiresAt: new Date(2023, 1, 15).toISOString()
        }
      ];
      
      const expectedSessions = [
        { 
          id: 'session1', 
          token: 'token123...', 
          createdAt: new Date(2023, 1, 1).toISOString(),
          expiresAt: new Date(2023, 2, 1).toISOString()
        },
        { 
          id: 'session2', 
          token: 'token234...', 
          createdAt: new Date(2023, 0, 15).toISOString(),
          expiresAt: new Date(2023, 1, 15).toISOString()
        }
      ];
      
      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      
      const response = await app.request('/api/v1/auth/sessions');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.sessions).toEqual(expectedSessions);
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
          orderBy: { createdAt: 'desc' }
        })
      );
    });
  });
});
