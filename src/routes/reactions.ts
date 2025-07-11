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
    validatedParams: MessageReactionParams
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
  validateParams(messageReactionParamsSchema),
  validateBody(addReactionSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { messageId } = c.get('validatedParams') as MessageReactionParams;
      const reactionData = c.get('validatedBody') as AddReactionInput;

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

      // For now, we'll use a dummy user ID - in real implementation this would come from auth
      const userId = 'dummy-user-id'; // TODO: Replace with actual authenticated user ID

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

export { reactionRoutes };
