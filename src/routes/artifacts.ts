// Artifact API routes

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
  createArtifactSchema, 
  updateArtifactSchema, 
  artifactQuerySchema,
  cuidSchema 
} from '../utils/validation';
import type { CreateArtifactInput, UpdateArtifactInput, ArtifactQuery } from '../utils/validation';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';

export interface Env {
  DB: D1Database;
}

// Parameter validation schemas
const artifactParamsSchema = z.object({
  id: cuidSchema
});

const threadArtifactParamsSchema = z.object({
  threadId: cuidSchema,
  id: cuidSchema.optional()
});

type ArtifactParams = z.infer<typeof artifactParamsSchema>;
type ThreadArtifactParams = z.infer<typeof threadArtifactParamsSchema>;

const artifactRoutes = new Hono<{ 
  Bindings: Env,
  Variables: {
    validatedBody: CreateArtifactInput | UpdateArtifactInput,
    validatedQuery: ArtifactQuery,
    validatedParams: ArtifactParams | ThreadArtifactParams
  }
}>();

// GET /artifacts - List all artifacts with pagination and filtering
artifactRoutes.get(
  '/artifacts',
  validateQuery(artifactQuerySchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const query = c.get('validatedQuery') as ArtifactQuery;
      
      // Build where clause for filtering
      const where: any = {};
      if (query.type) {
        where.type = query.type;
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
          type: true,
          title: true,
          description: true,
          content: true,
          blocks: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
          thread: {
            select: {
              id: true,
              title: true,
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

      const artifacts = await prisma.artifact.findMany(queryOptions);
      
      // Check if there are more results
      const hasMore = artifacts.length > query.limit;
      const items = hasMore ? artifacts.slice(0, -1) : artifacts;
      const continuationToken = hasMore ? items[items.length - 1].id : undefined;

      return createPaginatedResponse(items, {
        hasMore,
        continuationToken,
        pageSize: query.limit
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching artifacts:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch artifacts'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// GET /threads/:threadId/artifacts - List artifacts in a thread
artifactRoutes.get(
  '/threads/:threadId/artifacts',
  validateParams(threadArtifactParamsSchema),
  validateQuery(artifactQuerySchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { threadId } = c.get('validatedParams') as ThreadArtifactParams;
      const query = c.get('validatedQuery') as ArtifactQuery;
      
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
      if (query.type) {
        where.type = query.type;
      }
      if (query.createdAfter) {
        where.createdAt = { gte: query.createdAfter };
      }
      if (query.createdBefore) {
        where.createdAt = { ...where.createdAt, lte: query.createdBefore };
      }

      const artifacts = await prisma.artifact.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          content: true,
          blocks: true,
          version: true,
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
        orderBy: {
          [query.orderBy]: query.orderDirection
        }
      });

      return createSuccessResponse(artifacts, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching thread artifacts:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch thread artifacts'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// GET /artifacts/:id - Get artifact by ID
artifactRoutes.get(
  '/artifacts/:id',
  validateParams(artifactParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as ArtifactParams;

      const artifact = await prisma.artifact.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          content: true,
          blocks: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
          thread: {
            select: {
              id: true,
              title: true,
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
          }
        }
      });

      if (!artifact) {
        return createErrorResponse({
          status: 404,
          title: 'Artifact Not Found',
          detail: `Artifact with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      return createSuccessResponse(artifact, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching artifact:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch artifact'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// POST /threads/:threadId/artifacts - Create new artifact in thread
artifactRoutes.post(
  '/threads/:threadId/artifacts',
  validateParams(threadArtifactParamsSchema),
  validateBody(createArtifactSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { threadId } = c.get('validatedParams') as ThreadArtifactParams;
      const artifactData = c.get('validatedBody') as CreateArtifactInput;

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

      // For now, we'll use a dummy user ID - in real implementation this would come from auth
      const userId = 'dummy-user-id'; // TODO: Replace with actual authenticated user ID

      const artifact = await prisma.artifact.create({
        data: {
          threadId: threadId,
          userId: userId,
          type: artifactData.type,
          title: artifactData.title,
          description: artifactData.description,
          content: artifactData.content,
          blocks: artifactData.blocks,
          metadata: artifactData.metadata || {}
        },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          version: true,
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

      return createSuccessResponse(artifact, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error creating artifact:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to create artifact'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// PUT /artifacts/:id - Update artifact
artifactRoutes.put(
  '/artifacts/:id',
  validateParams(artifactParamsSchema),
  validateBody(updateArtifactSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as ArtifactParams;
      const updateData = c.get('validatedBody') as UpdateArtifactInput;

      // Check if artifact exists
      const existingArtifact = await prisma.artifact.findUnique({
        where: { id }
      });

      if (!existingArtifact) {
        return createErrorResponse({
          status: 404,
          title: 'Artifact Not Found',
          detail: `Artifact with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      const artifact = await prisma.artifact.update({
        where: { id },
        data: {
          ...updateData,
          version: existingArtifact.version + 1 // Increment version
        },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          content: true,
          blocks: true,
          version: true,
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

      return createSuccessResponse(artifact, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error updating artifact:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to update artifact'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// DELETE /artifacts/:id - Delete artifact
artifactRoutes.delete(
  '/artifacts/:id',
  validateParams(artifactParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as ArtifactParams;

      // Check if artifact exists
      const existingArtifact = await prisma.artifact.findUnique({
        where: { id }
      });

      if (!existingArtifact) {
        return createErrorResponse({
          status: 404,
          title: 'Artifact Not Found',
          detail: `Artifact with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      await prisma.artifact.delete({
        where: { id }
      });

      return createSuccessResponse({
        deleted: true,
        id
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error deleting artifact:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to delete artifact'
      }, getCorrelationId(c.req.raw));
    }
  }
);

export { artifactRoutes };
