// Thread API routes

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
  createThreadSchema, 
  updateThreadSchema, 
  threadQuerySchema,
  cuidSchema 
} from '../utils/validation';
import type { CreateThreadInput, UpdateThreadInput, ThreadQuery } from '../utils/validation';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { authenticateUser, type AuthenticatedUser } from '../middleware/auth';

export interface Env {
  DB: D1Database;
}

// Parameter validation schemas
const threadParamsSchema = z.object({
  id: cuidSchema
});

type ThreadParams = z.infer<typeof threadParamsSchema>;

const threadRoutes = new Hono<{ 
  Bindings: Env,
  Variables: {
    validatedBody: CreateThreadInput | UpdateThreadInput,
    validatedQuery: ThreadQuery,
    validatedParams: ThreadParams,
    authenticatedUser?: AuthenticatedUser
  }
}>();

// GET /threads - List threads with pagination and filtering
threadRoutes.get(
  '/threads',
  validateQuery(threadQuerySchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const query = c.get('validatedQuery') as ThreadQuery;
      const authenticatedUser = c.get('authenticatedUser');
      
      if (!authenticatedUser) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'User must be authenticated to access threads'
        }, getCorrelationId(c.req.raw));
      }
      
      // Build where clause for filtering - only show user's own threads
      const where: any = {
        userId: authenticatedUser.id
      };
      if (query.status) {
        where.status = query.status;
      }
      if (query.title) {
        where.title = { contains: query.title };
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
          title: true,
          status: true,
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

      const threads = await prisma.thread.findMany(queryOptions);
      
      // Check if there are more results
      const hasMore = threads.length > query.limit;
      const items = hasMore ? threads.slice(0, -1) : threads;
      const continuationToken = hasMore ? items[items.length - 1].id : undefined;

      return createPaginatedResponse(items, {
        hasMore,
        continuationToken,
        pageSize: query.limit
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching threads:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch threads'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// GET /threads/:id - Get thread by ID
threadRoutes.get(
  '/threads/:id',
  validateParams(threadParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as ThreadParams;
      const authenticatedUser = c.get('authenticatedUser');
      
      if (!authenticatedUser) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'User must be authenticated to access threads'
        }, getCorrelationId(c.req.raw));
      }

      const thread = await prisma.thread.findFirst({
        where: { 
          id,
          userId: authenticatedUser.id  // Only allow access to user's own threads
        },
        select: {
          id: true,
          title: true,
          status: true,
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

      if (!thread) {
        return createErrorResponse({
          status: 404,
          title: 'Thread Not Found',
          detail: `Thread with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      return createSuccessResponse(thread, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching thread:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch thread'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// POST /threads - Create new thread
threadRoutes.post(
  '/threads',
  validateBody(createThreadSchema),
  async (c) => {
    try {
      console.log('=== Thread Creation Started ===');
      const prisma = getDatabaseClient(c.env.DB);
      const threadData = c.get('validatedBody') as CreateThreadInput;
      const authenticatedUser = c.get('authenticatedUser');
      
      if (!authenticatedUser) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'User must be authenticated to create threads'
        }, getCorrelationId(c.req.raw));
      }
      
      console.log('Thread data received:', JSON.stringify(threadData, null, 2));
      console.log('User ID:', authenticatedUser.id);

      const thread = await prisma.thread.create({
        data: {
          title: threadData.title,
          userId: authenticatedUser.id,
          metadata: {
            ...threadData.metadata || {},
            ...(threadData.description && { description: threadData.description })
          }
        },
        select: {
          id: true,
          title: true,
          status: true,
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

      console.log('Thread created successfully:', thread.id);
      console.log('=== Thread Creation Completed ===');

      return createSuccessResponse(thread, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error creating thread:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to create thread'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// PUT /threads/:id - Update thread
threadRoutes.put(
  '/threads/:id',
  authenticateUser,
  validateParams(threadParamsSchema),
  validateBody(updateThreadSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as ThreadParams;
      const updateData = c.get('validatedBody') as UpdateThreadInput;
      const authenticatedUser = c.get('authenticatedUser');
      
      if (!authenticatedUser) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'User must be authenticated to update threads'
        }, getCorrelationId(c.req.raw));
      }

      // Check if thread exists and belongs to user
      const existingThread = await prisma.thread.findFirst({
        where: { 
          id,
          userId: authenticatedUser.id
        }
      });

      if (!existingThread) {
        return createErrorResponse({
          status: 404,
          title: 'Thread Not Found',
          detail: `Thread with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      const thread = await prisma.thread.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          title: true,
          status: true,
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

      return createSuccessResponse(thread, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error updating thread:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to update thread'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// DELETE /threads/:id - Delete thread
threadRoutes.delete(
  '/threads/:id',
  authenticateUser,
  validateParams(threadParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as ThreadParams;
      const authenticatedUser = c.get('authenticatedUser');
      
      if (!authenticatedUser) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'User must be authenticated to delete threads'
        }, getCorrelationId(c.req.raw));
      }

      // Check if thread exists and belongs to user
      const existingThread = await prisma.thread.findFirst({
        where: { 
          id,
          userId: authenticatedUser.id
        }
      });

      if (!existingThread) {
        return createErrorResponse({
          status: 404,
          title: 'Thread Not Found',
          detail: `Thread with ID ${id} was not found or you don't have permission to access it`
        }, getCorrelationId(c.req.raw));
      }

      await prisma.thread.delete({
        where: { id }
      });

      return createSuccessResponse({
        deleted: true,
        id
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error deleting thread:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to delete thread'
      }, getCorrelationId(c.req.raw));
    }
  }
);

export { threadRoutes };
