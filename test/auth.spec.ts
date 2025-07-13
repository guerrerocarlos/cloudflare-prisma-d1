// Unit tests for authentication middleware

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authenticateUser, optionalAuth, requireRole, getCurrentUser } from '../src/middleware/auth';
import { setupDatabaseMocks, setupAuthMocks, createTestApp, setupCommonMocks } from './helpers/test-setup';
import type { Context } from 'hono';

// Setup mocks
setupDatabaseMocks();
setupAuthMocks();

describe('Authentication Middleware', () => {
  let testContext: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    setupCommonMocks();
    
    // Create a test app with empty routes for auth middleware tests
    testContext = createTestApp(app => app);
    
    vi.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('should fail with missing Authorization header', async () => {
      testContext.app.get('/test', authenticateUser, (c: Context) => {
        return c.json({ success: true });
      });

      const response = await testContext.app.request('/test');

      expect(response.status).toBe(401);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Authentication Required');
    });

    it('should fail with invalid Authorization header format', async () => {
      testContext.app.get('/test', authenticateUser, (c: Context) => {
        return c.json({ success: true });
      });

      const response = await testContext.app.request('/test', {
        headers: {
          'Authorization': 'Invalid token-format'
        }
      });

      expect(response.status).toBe(401);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Authentication Required');
    });

    it('should fail with empty token', async () => {
      testContext.app.get('/test', authenticateUser, (c: Context) => {
        return c.json({ success: true });
      });

      const response = await testContext.app.request('/test', {
        headers: {
          'Authorization': 'Bearer '
        }
      });

      expect(response.status).toBe(401);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Authentication Required');
    });
  });

  describe('optionalAuth', () => {
    it('should continue without authentication when no header is provided', async () => {
      testContext.app.get('/test', optionalAuth, (c: Context) => {
        const user = getCurrentUser(c);
        return c.json({ success: true, user });
      });

      const response = await testContext.app.request('/test');

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.user).toBeNull();
    });

    it('should continue without authentication when invalid token is provided', async () => {
      testContext.app.get('/test', optionalAuth, (c: Context) => {
        const user = getCurrentUser(c);
        return c.json({ success: true, user });
      });

      const response = await testContext.app.request('/test', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.user).toBeNull();
    });
  });

  describe('requireRole', () => {
    it('should fail when no user is authenticated', async () => {
      testContext.app.get('/test', requireRole(['ADMIN']), (c: Context) => {
        return c.json({ success: true });
      });

      const response = await testContext.app.request('/test');

      expect(response.status).toBe(401);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Authentication Required');
    });

    it('should fail when user does not have required role', async () => {
      testContext.app.get('/test', async (c: Context) => {
        // Mock authenticated user with USER role
        c.set('authenticatedUser', {
          id: 'user-id',
          email: 'user@example.com',
          name: 'Test User',
          nick: 'testuser',
          role: 'USER',
          avatarUrl: null
        });
        
        // Middleware should throw an error for insufficient permissions
        await requireRole(['ADMIN'])(c, async () => {
          return c.json({ success: true });
        });
        
        return c.json({ success: true });
      });

      const response = await testContext.app.request('/test', {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      expect(response.status).toBe(403);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Forbidden');
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is authenticated', async () => {
      testContext.app.get('/test', (c: Context) => {
        const user = getCurrentUser(c);
        return c.json({ success: true, user });
      });

      const response = await testContext.app.request('/test');

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.user).toBeNull();
    });

    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER'
      };

      testContext.app.get('/test', (c: Context) => {
        c.set('authenticatedUser', mockUser);
        const user = getCurrentUser(c);
        return c.json({ success: true, user });
      });

      const response = await testContext.app.request('/test');

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.user).toEqual(mockUser);
    });
  });
});
