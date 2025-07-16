// Reaction API routes

import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabaseClient } from '../utils/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getCorrelationId 
} from '../utils/response';
import { 
  addReactionSchema,
  cuidSchema 
} from '../utils/validation';
import type { AddReactionInput } from '../utils/validation';
import { validateBody, validateParams } from '../middleware/validation';
import { authenticateUser, getCurrentUser, type AuthenticatedUser } from '../middleware/auth';

export interface Env {
  DB: D1Database;
}

// Parameter validation schemas
const messageReactionParamsSchema = z.object({
  messageId: cuidSchema
});

type MessageReactionParams = z.infer<typeof messageReactionParamsSchema>;

const reactionRoutes = new Hono<{ 
  Bindings: Env,
  Variables: {
    validatedBody: AddReactionInput,
    validatedParams: MessageReactionParams,
    authenticatedUser: AuthenticatedUser
  }
}>();

// GET /messages/:messageId/reactions - Get reactions for a message
reactionRoutes.get(
  '/messages/:messageId/reactions',
  validateParams(messageReactionParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { messageId } = c.get('validatedParams') as MessageReactionParams;

      // Check if message exists
      const message = await prisma.message.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        return createErrorResponse({
          status: 404,
          title: 'Message Not Found',
          detail: `Message with ID ${messageId} was not found`
        }, getCorrelationId(c.req.raw));
      }

      const reactions = await prisma.reaction.findMany({
        where: { messageId },
        select: {
          id: true,
          emoji: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              nick: true,
              avatarUrl: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Group reactions by emoji
      const groupedReactions = reactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            emoji: reaction.emoji,
            count: 0,
            users: []
          };
        }
        acc[reaction.emoji].count++;
        acc[reaction.emoji].users.push(reaction.user);
        return acc;
      }, {} as Record<string, any>);

      return createSuccessResponse({
        messageId,
        reactions: Object.values(groupedReactions),
        total: reactions.length
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching reactions:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch reactions'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// POST /messages/:messageId/reactions - Add or remove reaction
reactionRoutes.post(
  '/messages/:messageId/reactions',
  authenticateUser,
  validateParams(messageReactionParamsSchema),
  validateBody(addReactionSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { messageId } = c.get('validatedParams') as MessageReactionParams;
      const reactionData = c.get('validatedBody') as AddReactionInput;
      const user = getCurrentUser(c);

      if (!user) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'User must be authenticated to manage reactions'
        }, getCorrelationId(c.req.raw));
      }

      // Check if message exists
      const message = await prisma.message.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        return createErrorResponse({
          status: 404,
          title: 'Message Not Found',
          detail: `Message with ID ${messageId} was not found`
        }, getCorrelationId(c.req.raw));
      }

      const userId = user.id;

      // Ensure the user exists in the database (auto-create if authenticated but not in DB)
      let dbUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!dbUser) {
        // Create user from authenticated info if not in database
        dbUser = await prisma.user.create({
          data: {
            id: userId,
            email: user.email,
            name: user.name,
            nick: user.nick,
            avatarUrl: user.avatarUrl,
            role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
            lastLoginAt: new Date()
          }
        });
      }

      if (reactionData.action === 'add') {
        // Check if reaction already exists
        const existingReaction = await prisma.reaction.findFirst({
          where: {
            messageId,
            userId,
            emoji: reactionData.emoji
          }
        });

        if (existingReaction) {
          return createErrorResponse({
            status: 409,
            title: 'Reaction Already Exists',
            detail: 'User has already reacted with this emoji'
          }, getCorrelationId(c.req.raw));
        }

        // Add reaction
        const reaction = await prisma.reaction.create({
          data: {
            messageId,
            userId,
            emoji: reactionData.emoji
          },
          select: {
            id: true,
            emoji: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                nick: true,
                avatarUrl: true
              }
            }
          }
        });

        return createSuccessResponse(reaction, {
          correlation_id: getCorrelationId(c.req.raw)
        });
      } else if (reactionData.action === 'remove') {
        // Find and remove reaction
        const existingReaction = await prisma.reaction.findFirst({
          where: {
            messageId,
            userId,
            emoji: reactionData.emoji
          }
        });

        if (!existingReaction) {
          return createErrorResponse({
            status: 404,
            title: 'Reaction Not Found',
            detail: 'No reaction found to remove'
          }, getCorrelationId(c.req.raw));
        }

        await prisma.reaction.delete({
          where: { id: existingReaction.id }
        });

        return createSuccessResponse({
          removed: true,
          emoji: reactionData.emoji,
          messageId
        }, {
          correlation_id: getCorrelationId(c.req.raw)
        });
      }

      return createErrorResponse({
        status: 400,
        title: 'Invalid Action',
        detail: 'Action must be either "add" or "remove"'
      }, getCorrelationId(c.req.raw));
    } catch (error) {
      console.error('Error managing reaction:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to manage reaction'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// DELETE /messages/:messageId/reactions - Remove all user reactions from a message
reactionRoutes.delete(
  '/messages/:messageId/reactions',
  authenticateUser,
  validateParams(messageReactionParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { messageId } = c.get('validatedParams') as MessageReactionParams;
      const user = getCurrentUser(c);

      if (!user) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'User must be authenticated to manage reactions'
        }, getCorrelationId(c.req.raw));
      }

      // Check if message exists
      const message = await prisma.message.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        return createErrorResponse({
          status: 404,
          title: 'Message Not Found',
          detail: `Message with ID ${messageId} was not found`
        }, getCorrelationId(c.req.raw));
      }

      const userId = user.id;

      // Ensure the user exists in the database
      let dbUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!dbUser) {
        // Create user from authenticated info if not in database
        dbUser = await prisma.user.create({
          data: {
            id: userId,
            email: user.email,
            name: user.name,
            nick: user.nick,
            avatarUrl: user.avatarUrl,
            role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
            lastLoginAt: new Date()
          }
        });
      }

      // Remove all user reactions for this message
      const deleteResult = await prisma.reaction.deleteMany({
        where: {
          messageId,
          userId
        }
      });

      return createSuccessResponse({
        removed: true,
        messageId,
        count: deleteResult.count
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error removing reactions:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to remove reactions'
      }, getCorrelationId(c.req.raw));
    }
  }
);

export { reactionRoutes };
