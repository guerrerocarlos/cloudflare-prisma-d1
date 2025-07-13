// Unit tests for reaction routes

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { reactionRoutes } from '../../src/routes/reactions';
import * as database from '../../src/utils/database';

// Mock the database client
vi.mock('../../src/utils/database', () => ({
  getDatabaseClient: () => ({
    reaction: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    message: {
      findUnique: vi.fn(),
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

describe('Reaction Routes', () => {
  let app: Hono;
  let mockPrisma: any;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/v1', reactionRoutes);
    
    // Get mock reference for assertions
    mockPrisma = vi.mocked(database.getDatabaseClient(undefined as any));
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/v1/messages/:messageId/reactions', () => {
    it('should return reactions for a message', async () => {
      const messageId = 'test-message-id';
      const mockReactions = [
        { 
          id: 'reaction1', 
          messageId, 
          emoji: '👍', 
          createdAt: new Date().toISOString(),
          user: { id: 'user1', name: 'User One' }
        },
        { 
          id: 'reaction2', 
          messageId, 
          emoji: '👍', 
          createdAt: new Date().toISOString(),
          user: { id: 'user2', name: 'User Two' }
        },
        { 
          id: 'reaction3', 
          messageId, 
          emoji: '❤️', 
          createdAt: new Date().toISOString(),
          user: { id: 'user3', name: 'User Three' }
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
      
      const response = await app.request('/api/v1/messages/nonexistent/reactions');
      
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
        emoji: '👍'
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
      
      const response = await app.request('/api/v1/messages/nonexistent/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: '👍' })
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
      mockPrisma.reaction.findFirst.mockResolvedValue(existingReaction);
      mockPrisma.reaction.delete.mockResolvedValue(existingReaction);
      
      const response = await app.request(`/api/v1/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: '👍' })
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
      mockPrisma.reaction.delete = vi.fn().mockResolvedValue({ count: 2 });
      
      const response = await app.request(`/api/v1/messages/${messageId}/reactions`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(mockPrisma.reaction.delete).toHaveBeenCalledWith({
        where: {
          messageId,
          userId: 'test-user-id' // From mock auth
        }
      });
    });
    
    it('should return 404 when message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);
      
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
