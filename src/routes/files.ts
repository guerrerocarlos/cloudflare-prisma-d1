// File API routes

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
  createFileSchema, 
  fileQuerySchema,
  cuidSchema 
} from '../utils/validation';
import type { CreateFileInput, FileQuery } from '../utils/validation';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';

export interface Env {
  DB: D1Database;
}

// Parameter validation schemas
const fileParamsSchema = z.object({
  id: cuidSchema
});

type FileParams = z.infer<typeof fileParamsSchema>;

const fileRoutes = new Hono<{ 
  Bindings: Env,
  Variables: {
    validatedBody: CreateFileInput,
    validatedQuery: FileQuery,
    validatedParams: FileParams,
    authenticatedUser?: import('../middleware/auth').AuthenticatedUser
  }
}>();

// GET /files - List files with pagination and filtering
fileRoutes.get(
  '/files',
  validateQuery(fileQuerySchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const query = c.get('validatedQuery') as FileQuery;
      const authenticatedUser = c.get('authenticatedUser');

      if (!authenticatedUser) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'Must be authenticated to access files'
        }, getCorrelationId(c.req.raw));
      }
      
      // Build where clause for filtering - only show files uploaded by the authenticated user
      const where: any = {
        uploadedBy: authenticatedUser.id
      };
      if (query.mimeType) {
        where.mimeType = { contains: query.mimeType };
      }
      if (query.sizeMin) {
        where.size = { gte: query.sizeMin };
      }
      if (query.sizeMax) {
        where.size = { ...where.size, lte: query.sizeMax };
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
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          checksum: true,
          storageUrl: true,
          previewUrl: true,
          createdAt: true,
          metadata: true,
          uploader: {
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

      const files = await prisma.file.findMany(queryOptions);
      
      // Check if there are more results
      const hasMore = files.length > query.limit;
      const items = hasMore ? files.slice(0, -1) : files;
      const continuationToken = hasMore ? items[items.length - 1].id : undefined;

      return createPaginatedResponse(items, {
        hasMore,
        continuationToken,
        pageSize: query.limit
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching files:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch files'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// GET /files/:id - Get file by ID
fileRoutes.get(
  '/files/:id',
  validateParams(fileParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as FileParams;
      const authenticatedUser = c.get('authenticatedUser');

      if (!authenticatedUser) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'Must be authenticated to access files'
        }, getCorrelationId(c.req.raw));
      }

      const file = await prisma.file.findUnique({
        where: { 
          id,
          uploadedBy: authenticatedUser.id // Ensure user owns the file
        },
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          checksum: true,
          storageUrl: true,
          previewUrl: true,
          createdAt: true,
          metadata: true,
          uploader: {
            select: {
              id: true,
              email: true,
              name: true,
              nick: true,
              avatarUrl: true
            }
          },
          messages: {
            select: {
              message: {
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  thread: {
                    select: {
                      id: true,
                      title: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!file) {
        return createErrorResponse({
          status: 404,
          title: 'File Not Found',
          detail: `File with ID ${id} was not found or you don't have access to it`
        }, getCorrelationId(c.req.raw));
      }

      return createSuccessResponse(file, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching file:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch file'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// POST /files - Create new file record
fileRoutes.post(
  '/files',
  validateBody(createFileSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const fileData = c.get('validatedBody') as CreateFileInput;
      const authenticatedUser = c.get('authenticatedUser');

      if (!authenticatedUser) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'Must be authenticated to create files'
        }, getCorrelationId(c.req.raw));
      }

      const file = await prisma.file.create({
        data: {
          filename: fileData.filename,
          originalName: fileData.originalName,
          mimeType: fileData.mimeType,
          size: fileData.size,
          checksum: fileData.checksum,
          storageUrl: fileData.storageUrl,
          previewUrl: fileData.previewUrl,
          uploadedBy: authenticatedUser.id,
          metadata: fileData.metadata || {}
        },
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          checksum: true,
          storageUrl: true,
          previewUrl: true,
          createdAt: true,
          metadata: true,
          uploader: {
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

      return createSuccessResponse(file, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error creating file:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to create file'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// DELETE /files/:id - Delete file
fileRoutes.delete(
  '/files/:id',
  validateParams(fileParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as FileParams;
      const authenticatedUser = c.get('authenticatedUser');

      if (!authenticatedUser) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'Must be authenticated to delete files'
        }, getCorrelationId(c.req.raw));
      }

      // Check if file exists and belongs to the authenticated user
      const existingFile = await prisma.file.findUnique({
        where: { 
          id,
          uploadedBy: authenticatedUser.id // Ensure user owns the file
        }
      });

      if (!existingFile) {
        return createErrorResponse({
          status: 404,
          title: 'File Not Found',
          detail: `File with ID ${id} was not found or you don't have access to it`
        }, getCorrelationId(c.req.raw));
      }

      await prisma.file.delete({
        where: { id }
      });

      return createSuccessResponse({
        deleted: true,
        id
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to delete file'
      }, getCorrelationId(c.req.raw));
    }
  }
);

export { fileRoutes };
