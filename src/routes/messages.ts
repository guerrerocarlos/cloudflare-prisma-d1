// Message API routes

import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabaseClient } from '../utils/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getCorrelationId,
  createPaginatedResponse 
} from '../utils/response';
import { 
  createMessageSchema, 
  updateMessageSchema, 
  messageQuerySchema,
  cuidSchema 
} from '../utils/validation';
import type { CreateMessageInput, UpdateMessageInput, MessageQuery } from '../utils/validation';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { CompletionService } from '../services/completion-service';
import type { ChatMessage } from '../types/completions';

export interface Env {
  DB: D1Database;
  OPENAI_API_KEY?: string;
  DEFAULT_AI_MODEL?: string;
  AUTO_COMPLETION_ENABLED?: string;
}

// Parameter validation schemas
const messageParamsSchema = z.object({
  id: cuidSchema
});

const threadMessageParamsSchema = z.object({
  threadId: cuidSchema,
  id: cuidSchema.optional()
});

type MessageParams = z.infer<typeof messageParamsSchema>;
type ThreadMessageParams = z.infer<typeof threadMessageParamsSchema>;

// Helper function to convert database messages to chat completion format
function convertMessagesToChatFormat(messages: any[]): ChatMessage[] {
  return messages.map(msg => ({
    role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
    content: msg.content,
    // Only add name if user exists and sanitize it for OpenAI compatibility
    ...(msg.user?.name && { 
      name: sanitizeNameForOpenAI(msg.user.name) 
    })
  }));
}

// Helper function to sanitize name for OpenAI API compatibility
// OpenAI requires name field to match pattern: ^[^\s<|\\/>]+$
// (no whitespace, no < | \ / > characters)
function sanitizeNameForOpenAI(name: string): string {
  return name
    .replace(/[\s<|\\/>]+/g, '_')  // Replace invalid characters with underscore
    .replace(/^_+|_+$/g, '')      // Remove leading/trailing underscores
    .substring(0, 64) || 'user';   // Limit length and fallback to 'user' if empty
}

// Helper function to automatically generate completion for user messages
async function generateAutoCompletion(
  threadId: string, 
  userMessage: any, 
  env: any,
  authenticatedUser: any
): Promise<any | null> {
  try {
    const prisma = getDatabaseClient(env.DB);
    
    // Get recent messages from the thread (last 10 messages for context)
    const recentMessages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: {
        role: true,
        content: true,
        user: {
          select: {
            name: true,
            nick: true
          }
        }
      }
    });

    // Convert to chat completion format
    const chatMessages = convertMessagesToChatFormat(recentMessages);
    
    // Create completion request
    const completionRequest = {
      model: env.DEFAULT_AI_MODEL || 'gpt-4o',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 1000,
      n: 1,
      stream: false
    };

    // Generate completion using the service
    const result = await CompletionService.createCompletion(
      completionRequest, 
      authenticatedUser, 
      env
    );

    // Create assistant message with the completion
    if (result?.completion?.choices?.[0]?.message?.content) {
      const assistantMessage = await prisma.message.create({
        data: {
          threadId: threadId,
          userId: null, // Assistant messages don't have a userId
          role: 'ASSISTANT',
          content: result.completion.choices[0].message.content,
          blocks: [],
          metadata: {
            completionId: result.record?.id,
            model: result.completion.model,
            usage: {
              prompt_tokens: result.completion.usage?.prompt_tokens,
              completion_tokens: result.completion.usage?.completion_tokens,
              total_tokens: result.completion.usage?.total_tokens
            }
          }
        },
        select: {
          id: true,
          role: true,
          content: true,
          blocks: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
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

      return assistantMessage;
    }

    return null;
  } catch (error) {
    console.error('Error generating auto completion:', error);
    return null;
  }
}

const messageRoutes = new Hono<{ 
  Bindings: Env,
  Variables: {
    validatedBody: CreateMessageInput | UpdateMessageInput,
    validatedQuery: MessageQuery,
    validatedParams: MessageParams | ThreadMessageParams,
    authenticatedUser?: import('../middleware/auth').AuthenticatedUser
  }
}>();

// GET /threads/:threadId/messages - List messages in a thread with pagination
messageRoutes.get(
  '/threads/:threadId/messages',
  validateParams(threadMessageParamsSchema),
  validateQuery(messageQuerySchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { threadId } = c.get('validatedParams') as ThreadMessageParams;
      const query = c.get('validatedQuery') as MessageQuery;
      
      // Check if thread exists
      const thread = await prisma.thread.findUnique({
        where: { id: threadId }
      });

      if (!thread) {
        return createErrorResponse({
          status: 404,
          title: 'Thread Not Found',
          detail: `Thread with ID ${threadId} was not found`
        }, getCorrelationId(c.req.raw));
      }

      // Build where clause for filtering
      const where: any = {
        threadId: threadId
      };
      if (query.role) {
        where.role = query.role;
      }
      if (query.hasAttachments !== undefined) {
        if (query.hasAttachments) {
          where.files = { some: {} };
        } else {
          where.files = { none: {} };
        }
      }
      if (query.createdAfter) {
        where.createdAt = { gte: query.createdAfter };
      }
      if (query.createdBefore) {
        where.createdAt = { ...where.createdAt, lte: query.createdBefore };
      }

      // Handle cursor-based pagination
      const queryOptions: any = {
        where,
        select: {
          id: true,
          role: true,
          content: true,
          blocks: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              nick: true,
              avatarUrl: true
            }
          },
          files: {
            select: {
              file: {
                select: {
                  id: true,
                  filename: true,
                  originalName: true,
                  mimeType: true,
                  size: true,
                  storageUrl: true,
                  previewUrl: true
                }
              },
            }
          },
          reactions: {
            select: {
              emoji: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  nick: true
                }
              }
            }
          }
        },
        take: query.limit + 1, // Take one extra to check if there are more
        orderBy: {
          [query.orderBy]: query.orderDirection
        }
      };

      if (query.cursor) {
        queryOptions.cursor = { id: query.cursor };
        queryOptions.skip = 1; // Skip the cursor item
      }

      const messages = await prisma.message.findMany(queryOptions);
      
      // Check if there are more results
      const hasMore = messages.length > query.limit;
      const items = hasMore ? messages.slice(0, -1) : messages;
      const continuationToken = hasMore ? items[items.length - 1].id : undefined;

      return createPaginatedResponse(items, {
        hasMore,
        continuationToken,
        pageSize: query.limit
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch messages'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// GET /messages/:id - Get message by ID
messageRoutes.get(
  '/messages/:id',
  validateParams(messageParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as MessageParams;

      const message = await prisma.message.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          content: true,
          blocks: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
          thread: {
            select: {
              id: true,
              status: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              nick: true,
              avatarUrl: true
            }
          },
          files: {
            select: {
              file: {
                select: {
                  id: true,
                  filename: true,
                  originalName: true,
                  mimeType: true,
                  size: true,
                  storageUrl: true,
                  previewUrl: true
                }
              },
            }
          },
          reactions: {
            select: {
              emoji: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  nick: true
                }
              }
            }
          }
        }
      });

      if (!message) {
        return createErrorResponse({
          status: 404,
          title: 'Message Not Found',
          detail: `Message with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      return createSuccessResponse(message, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching message:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch message'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// POST /threads/:threadId/messages - Create new message in thread
messageRoutes.post(
  '/threads/:threadId/messages',
  validateParams(threadMessageParamsSchema),
  validateBody(createMessageSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { threadId } = c.get('validatedParams') as ThreadMessageParams;
      const messageData = c.get('validatedBody') as CreateMessageInput;

      // Check if thread exists
      const thread = await prisma.thread.findUnique({
        where: { id: threadId }
      });

      if (!thread) {
        return createErrorResponse({
          status: 404,
          title: 'Thread Not Found',
          detail: `Thread with ID ${threadId} was not found`
        }, getCorrelationId(c.req.raw));
      }

      // For user messages, get userId from authenticated user; for assistant messages it's null
      const authenticatedUser = c.get('authenticatedUser');
      const userId = authenticatedUser?.id
      // messageData.role === 'USER' ? 
      //   (messageData.userId || authenticatedUser?.id) : null;

      // Validate that USER messages have a userId
      if (messageData.role === 'USER' && !userId) {
        return createErrorResponse({
          status: 400,
          title: 'Bad Request',
          detail: 'USER messages require authentication or explicit userId'
        }, getCorrelationId(c.req.raw));
      }

      const message = await prisma.message.create({
        data: {
          threadId: threadId,
          userId: userId,
          role: messageData.role,
          content: messageData.content,
          blocks: messageData.blocks || [],
          metadata: messageData.metadata || {}
        },
        select: {
          id: true,
          role: true,
          content: true,
          blocks: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
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
      });        // Handle attachments if provided
        if (messageData.attachments && messageData.attachments.length > 0) {
          await prisma.messageFile.createMany({
            data: messageData.attachments.map(attachment => ({
              messageId: message.id,
              fileId: attachment.file_id
            }))
          });
        }

      // Auto-generate completion for user messages
      let assistantMessage = null;
      if (messageData.role === 'USER' && authenticatedUser && c.env.AUTO_COMPLETION_ENABLED !== 'false') {
        try {
          assistantMessage = await generateAutoCompletion(
            threadId, 
            message, 
            c.env, 
            authenticatedUser
          );
        } catch (error) {
          console.error('Error generating auto completion:', error);
          // Continue without failing the entire request
        }
      }

      // Return both the user message and assistant message if generated
      const response = {
        userMessage: message,
        ...(assistantMessage && { assistantMessage })
      };

      return createSuccessResponse(response, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error creating message:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to create message'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// PUT /messages/:id - Update message
messageRoutes.put(
  '/messages/:id',
  validateParams(messageParamsSchema),
  validateBody(updateMessageSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as MessageParams;
      const updateData = c.get('validatedBody') as UpdateMessageInput;

      // Check if message exists
      const existingMessage = await prisma.message.findUnique({
        where: { id }
      });

      if (!existingMessage) {
        return createErrorResponse({
          status: 404,
          title: 'Message Not Found',
          detail: `Message with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      const message = await prisma.message.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          role: true,
          content: true,
          blocks: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
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

      return createSuccessResponse(message, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error updating message:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to update message'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// DELETE /messages/:id - Delete message
messageRoutes.delete(
  '/messages/:id',
  validateParams(messageParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as MessageParams;

      // Check if message exists
      const existingMessage = await prisma.message.findUnique({
        where: { id }
      });

      if (!existingMessage) {
        return createErrorResponse({
          status: 404,
          title: 'Message Not Found',
          detail: `Message with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      await prisma.message.delete({
        where: { id }
      });

      return createSuccessResponse({
        deleted: true,
        id
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to delete message'
      }, getCorrelationId(c.req.raw));
    }
  }
);

export { messageRoutes };
