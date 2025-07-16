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

import { reactionRoutes } from '../../src/routes/reactions';
import { getDatabaseClient } from '../../src/utils/database';
import { authenticateUser, getCurrentUser } from '../../src/middleware/auth';

// Create a mock function helper
function createPrismaMock() {
  const fn = vi.fn() as any;
  fn.mockResolvedValue = (value: any) => {
    fn.mockImplementation(() => Promise.resolve(value));
    return fn;
  };
  fn.mockResolvedValueOnce = (value: any) => {
    fn.mockImplementationOnce(() => Promise.resolve(value));
    return fn;
  };
  fn.mockRejectedValue = (value: any) => {
    fn.mockImplementation(() => Promise.reject(value));
    return fn;
  };
  fn.mockRejectedValueOnce = (value: any) => {
    fn.mockImplementationOnce(() => Promise.reject(value));
    return fn;
  };
  return fn;
}

// Create a complete Prisma client mock
function createMockPrismaClient() {
  return {
    user: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
    },
    thread: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
    },
    message: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
    },
    artifact: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
    },
    file: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
    },
    reaction: {
      findUnique: createPrismaMock(),
      findFirst: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
      deleteMany: createPrismaMock(),
    },
    session: {
      findUnique: createPrismaMock(),
      create: createPrismaMock(),
      update: createPrismaMock(),
      findMany: createPrismaMock(),
      count: createPrismaMock(),
      delete: createPrismaMock(),
    },
    $transaction: createPrismaMock(),
    $connect: createPrismaMock(),
    $disconnect: createPrismaMock(),
  };
}

describe('Reaction Routes', () => {
  let app: Hono;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeAll(() => {
    mockPrisma = createMockPrismaClient();
    
    // Mock the database client to return our mock Prisma
    (getDatabaseClient as any).mockReturnValue(mockPrisma);

    // Mock the authentication middleware
    (authenticateUser as any).mockImplementation(async (c: any, next: any) => {
      const mockUser = { 
        id: 'user123456789012345678901', 
        email: 'test@example.com',
        name: 'Test User',
        nick: null,
        role: 'USER',
        avatarUrl: null
      };
      c.set('authenticatedUser', mockUser);
      await next();
    });

    // Mock getCurrentUser function
    const mockUser = {
      id: 'user123456789012345678901', 
      email: 'test@example.com',
      name: 'Test User',
      nick: null,
      role: 'USER',
      avatarUrl: null
    };
    (getCurrentUser as any).mockReturnValue(mockUser);
  });

  beforeEach(() => {
    // Create a new app for each test
    app = new Hono();
    
    // Create a mock environment with a DB property
    const mockEnv = {
      DB: {} as D1Database
    };
    
    // Add the env to the app
    app.use('*', async (c, next) => {
      c.env = mockEnv;
      await next();
    });
    
    app.route('/api/v1', reactionRoutes);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/messages/:messageId/reactions', () => {
    it('should return reactions for a message', async () => {
      const messageId = 'msg1234567890123456789012';
      const mockReactions = [
        { 
          id: 'rxtn123456789012345678901', 
          messageId, 
          emoji: '👍', 
          createdAt: new Date().toISOString(),
          user: { id: 'user123456789012345678901', name: 'User One' }
        },
        { 
          id: 'rxtn123456789012345678902', 
          messageId, 
          emoji: '👍', 
          createdAt: new Date().toISOString(),
          user: { id: 'user123456789012345678902', name: 'User Two' }
        },
        { 
          id: 'rxtn123456789012345678903', 
          messageId, 
          emoji: '❤️', 
          createdAt: new Date().toISOString(),
          user: { id: 'user123456789012345678903', name: 'User Three' }
        }
      ];
      
      // Mock message existence
      mockPrisma.message.findUnique.mockResolvedValue({ id: messageId });
      mockPrisma.reaction.findMany.mockResolvedValue(mockReactions);
      
      const response = await app.request(`/api/v1/messages/${messageId}/reactions`);
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.messageId).toBe(messageId);
      expect(body.data.total).toBe(3);
      
      // Verify grouped reactions
      const groupedReactions = body.data.reactions;
      expect(groupedReactions).toHaveLength(2); // Two emojis: 👍 and ❤️
      
      // Check 👍 reaction group
      const thumbsUp = groupedReactions.find((r: any) => r.emoji === '👍');
      expect(thumbsUp.count).toBe(2);
      expect(thumbsUp.users).toHaveLength(2);
      
      // Check ❤️ reaction group
      const heart = groupedReactions.find((r: any) => r.emoji === '❤️');
      expect(heart.count).toBe(1);
      expect(heart.users).toHaveLength(1);
    });
    
    it('should return 404 when message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);
      
      const response = await app.request('/api/v1/messages/notfnd123456789012345678901/reactions');
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Message Not Found');
    });
  });

  describe('POST /api/v1/messages/:messageId/reactions', () => {
    it('should add a reaction to a message', async () => {
      const messageId = 'test-message-id';
      const reactionData = {
        emoji: '👍',
        action: 'add' as const
      };
      
      const createdReaction = {
        id: 'new-reaction-id',
        messageId,
        ...reactionData,
        userId: 'test-user-id',
        createdAt: new Date().toISOString()
      };
      
      // Mock message existence
      mockPrisma.message.findUnique.mockResolvedValue({ id: messageId });
      
      // Mock user (for authenticated user check)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123456789012345678901',
        email: 'test@example.com',
        name: 'Test User'
      });
      
      mockPrisma.reaction.findFirst.mockResolvedValue(null); // No existing reaction
      mockPrisma.reaction.create.mockResolvedValue(createdReaction);
      
      const response = await app.request(`/api/v1/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reactionData)
      });
      
      expect(response.status).toBe(201);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(createdReaction);
      expect(mockPrisma.reaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...reactionData,
          messageId,
          userId: 'test-user-id' // From mock auth
        })
      });
    });
    
    it('should return 404 when message to react to not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);
      
      // Mock user (for authenticated user check)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123456789012345678901',
        email: 'test@example.com',
        name: 'Test User'
      });
      
      const response = await app.request('/api/v1/messages/nonexistent/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: '👍', action: 'add' })
      });
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Message Not Found');
    });
    
    it('should remove existing reaction when same emoji is used', async () => {
      const messageId = 'test-message-id';
      const existingReaction = {
        id: 'existing-reaction',
        messageId,
        emoji: '👍',
        userId: 'test-user-id'
      };
      
      // Mock message and existing reaction
      mockPrisma.message.findUnique.mockResolvedValue({ id: messageId });
      
      // Mock user (for authenticated user check)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123456789012345678901',
        email: 'test@example.com',
        name: 'Test User'
      });
      
      mockPrisma.reaction.findFirst.mockResolvedValue(existingReaction);
      mockPrisma.reaction.delete.mockResolvedValue(existingReaction);
      
      const response = await app.request(`/api/v1/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: '👍', action: 'remove' })
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.removed).toBe(true);
      expect(mockPrisma.reaction.delete).toHaveBeenCalledWith({
        where: { id: existingReaction.id }
      });
    });
  });

  describe('DELETE /api/v1/messages/:messageId/reactions', () => {
    it('should remove all user reactions from a message', async () => {
      const messageId = 'test-message-id';
      
      // Mock message existence
      mockPrisma.message.findUnique.mockResolvedValue({ id: messageId });
      
      // Mock user (for authenticated user check)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123456789012345678901',
        email: 'test@example.com',
        name: 'Test User'
      });
      
      mockPrisma.reaction.deleteMany = vi.fn().mockResolvedValue({ count: 2 });
      
      const response = await app.request(`/api/v1/messages/${messageId}/reactions`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(mockPrisma.reaction.deleteMany).toHaveBeenCalledWith({
        where: {
          messageId,
          userId: 'user123456789012345678901' // From mock auth
        }
      });
    });
    
    it('should return 404 when message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);
      
      // Mock user (for authenticated user check)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123456789012345678901',
        email: 'test@example.com',
        name: 'Test User'
      });
      
      const response = await app.request('/api/v1/messages/nonexistent/reactions', {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(404);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Message Not Found');
    });
  });
});
