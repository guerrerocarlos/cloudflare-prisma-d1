// Unit tests for auth routes

import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';
import { Hono } from 'hono';
import { authRoutes } from '../../src/routes/auth';
import * as database from '../../src/utils/database';
import { setupDatabaseMocks, setupAuthMocks, createTestApp, setupCommonMocks } from '../helpers/test-setup';

// Setup all mocks
setupDatabaseMocks();
setupAuthMocks();
const { originalDateNow } = setupCommonMocks();

describe('Auth Routes', () => {
  let app: Hono;
  let mockPrisma: any;

  beforeEach(() => {
    const testSetup = createTestApp(authRoutes);
    app = testSetup.app;
    mockPrisma = testSetup.mockPrisma;
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Restore original functions
    vi.restoreAllMocks();
    Date.now = originalDateNow;
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
        }
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
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date().toISOString()
      };
      
      vi.mocked(authModule.getCurrentUser).mockReturnValue(mockUser);
      
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
          token: 'token1', 
          createdAt: new Date(2023, 1, 1).toISOString(),
          expiresAt: new Date(2023, 2, 1).toISOString(),
          current: true
        },
        { 
          id: 'session2', 
          token: 'token2', 
          createdAt: new Date(2023, 0, 15).toISOString(),
          expiresAt: new Date(2023, 1, 15).toISOString(),
          current: false
        }
      ];
      
      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      
      const response = await app.request('/api/v1/auth/sessions');
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.sessions).toEqual(mockSessions);
      expect(body.data.total).toBe(2);
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { 
            userId: 'test-user-id',
            expiresAt: { gt: expect.any(Date) }
          }
        })
      );
    });
  });
});
