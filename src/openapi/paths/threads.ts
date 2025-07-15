import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';
import { safeOpenApi } from '../../utils/openapi';
import { successResponseSchema, errorResponseSchema } from '../../utils/validation';

// User object schema (embedded in thread responses)
const threadUserSchema = z.object({
  id: safeOpenApi(
    z.string(),
    {
      description: 'User ID (CUID)',
      example: 'ck9x8v7b600034l5r8jlkf0a1'
    }
  ),
  email: safeOpenApi(
    z.string().email(),
    {
      description: 'User email address',
      example: 'user@example.com'
    }
  ),
  name: safeOpenApi(
    z.string().optional(),
    {
      description: 'User full name',
      example: 'John Doe'
    }
  ),
  nick: safeOpenApi(
    z.string().optional(),
    {
      description: 'User nickname/display name',
      example: 'johndoe'
    }
  ),
  avatarUrl: safeOpenApi(
    z.string().url().optional(),
    {
      description: 'User avatar URL',
      example: 'https://example.com/avatar.jpg'
    }
  )
});

// Thread object schema
const threadSchema = z.object({
  id: safeOpenApi(
    z.string(),
    {
      description: 'Thread ID (CUID)',
      example: 'ck9x8v7b600034l5r8jlkf0a2'
    }
  ),
  title: safeOpenApi(
    z.string().optional(),
    {
      description: 'Thread title',
      example: 'Discussion about AI ethics'
    }
  ),
  status: safeOpenApi(
    z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']),
    {
      description: 'Thread status',
      example: 'ACTIVE'
    }
  ),
  createdAt: safeOpenApi(
    z.string().datetime(),
    {
      description: 'Thread creation timestamp',
      example: '2025-07-15T10:30:00Z'
    }
  ),
  updatedAt: safeOpenApi(
    z.string().datetime(),
    {
      description: 'Thread last update timestamp',
      example: '2025-07-15T10:30:00Z'
    }
  ),
  metadata: safeOpenApi(
    z.record(z.any()).optional(),
    {
      description: 'Additional thread metadata',
      example: { tags: ['ai', 'ethics'], priority: 'high' }
    }
  ),
  user: threadUserSchema
});

// Thread creation input schema
const createThreadRequestSchema = z.object({
  title: safeOpenApi(
    z.string().min(1).max(200).optional(),
    {
      description: 'Thread title',
      example: 'Discussion about AI ethics'
    }
  ),
  description: safeOpenApi(
    z.string().max(1000).optional(),
    {
      description: 'Thread description',
      example: 'A detailed discussion about the ethical implications of AI'
    }
  ),
  metadata: safeOpenApi(
    z.record(z.any()).optional(),
    {
      description: 'Additional thread metadata',
      example: { tags: ['ai', 'ethics'], priority: 'high' }
    }
  )
});

// Thread update input schema
const updateThreadRequestSchema = z.object({
  title: safeOpenApi(
    z.string().min(1).max(200).optional(),
    {
      description: 'Thread title',
      example: 'Updated discussion about AI ethics'
    }
  ),
  status: safeOpenApi(
    z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional(),
    {
      description: 'Thread status',
      example: 'ACTIVE'
    }
  ),
  metadata: safeOpenApi(
    z.record(z.any()).optional(),
    {
      description: 'Additional thread metadata',
      example: { tags: ['ai', 'ethics'], priority: 'medium' }
    }
  )
});

// Paginated threads response schema
const threadsListResponseSchema = successResponseSchema.extend({
  data: z.array(threadSchema),
  pagination: z.object({
    hasMore: safeOpenApi(
      z.boolean(),
      {
        description: 'Whether there are more results available',
        example: true
      }
    ),
    continuationToken: safeOpenApi(
      z.string().optional(),
      {
        description: 'Token for fetching next page',
        example: 'ck9x8v7b600034l5r8jlkf0a2'
      }
    ),
    pageSize: safeOpenApi(
      z.number(),
      {
        description: 'Number of items in current page',
        example: 25
      }
    )
  })
});

// Single thread response schema
const threadResponseSchema = successResponseSchema.extend({
  data: threadSchema
});

// List threads route
export const listThreadsRoute = createRoute({
  method: 'get',
  path: '/api/v1/threads',
  tags: ['Threads'],
  summary: 'List threads',
  description: 'Retrieve a paginated list of threads with optional filtering',
  request: {
    query: z.object({
      limit: safeOpenApi(
        z.string()
          .transform(Number)
          .pipe(z.number().min(1).max(100))
          .optional(),
        {
          description: 'Maximum number of threads to return (1-100)',
          example: '25'
        }
      ),
      cursor: safeOpenApi(
        z.string().optional(),
        {
          description: 'Pagination cursor from previous response',
          example: 'ck9x8v7b600034l5r8jlkf0a2'
        }
      ),
      orderBy: safeOpenApi(
        z.enum(['createdAt', 'updatedAt', 'title']).optional(),
        {
          description: 'Field to order by',
          example: 'createdAt'
        }
      ),
      orderDirection: safeOpenApi(
        z.enum(['asc', 'desc']).optional(),
        {
          description: 'Order direction',
          example: 'desc'
        }
      ),
      status: safeOpenApi(
        z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional(),
        {
          description: 'Filter by thread status',
          example: 'ACTIVE'
        }
      ),
      title: safeOpenApi(
        z.string().optional(),
        {
          description: 'Filter by thread title (partial match)',
          example: 'AI ethics'
        }
      ),
      createdAfter: safeOpenApi(
        z.string().datetime().optional(),
        {
          description: 'Filter threads created after this date',
          example: '2025-07-01T00:00:00Z'
        }
      ),
      createdBefore: safeOpenApi(
        z.string().datetime().optional(),
        {
          description: 'Filter threads created before this date',
          example: '2025-07-15T23:59:59Z'
        }
      )
    })
  },
  responses: {
    200: {
      description: 'Successfully retrieved threads',
      content: {
        'application/json': {
          schema: threadsListResponseSchema
        }
      }
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    }
  }
});

// Get thread by ID route
export const getThreadRoute = createRoute({
  method: 'get',
  path: '/api/v1/threads/{id}',
  tags: ['Threads'],
  summary: 'Get thread by ID',
  description: 'Retrieve a specific thread by its ID',
  request: {
    params: z.object({
      id: safeOpenApi(
        z.string(),
        {
          description: 'Thread ID (CUID)',
          example: 'ck9x8v7b600034l5r8jlkf0a2'
        }
      )
    })
  },
  responses: {
    200: {
      description: 'Successfully retrieved thread',
      content: {
        'application/json': {
          schema: threadResponseSchema
        }
      }
    },
    404: {
      description: 'Thread not found',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    }
  }
});

// Create thread route
export const createThreadRoute = createRoute({
  method: 'post',
  path: '/api/v1/threads',
  tags: ['Threads'],
  summary: 'Create a new thread',
  description: 'Create a new conversation thread',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createThreadRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Thread created successfully',
      content: {
        'application/json': {
          schema: threadResponseSchema
        }
      }
    },
    400: {
      description: 'Invalid request body',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    }
  }
});

// Update thread route
export const updateThreadRoute = createRoute({
  method: 'put',
  path: '/api/v1/threads/{id}',
  tags: ['Threads'],
  summary: 'Update thread',
  description: 'Update an existing thread',
  request: {
    params: z.object({
      id: safeOpenApi(
        z.string(),
        {
          description: 'Thread ID (CUID)',
          example: 'ck9x8v7b600034l5r8jlkf0a2'
        }
      )
    }),
    body: {
      content: {
        'application/json': {
          schema: updateThreadRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Thread updated successfully',
      content: {
        'application/json': {
          schema: threadResponseSchema
        }
      }
    },
    400: {
      description: 'Invalid request parameters or body',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    },
    404: {
      description: 'Thread not found',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    }
  }
});

// Delete thread route
export const deleteThreadRoute = createRoute({
  method: 'delete',
  path: '/api/v1/threads/{id}',
  tags: ['Threads'],
  summary: 'Delete thread',
  description: 'Delete a thread (soft delete - marks as DELETED)',
  request: {
    params: z.object({
      id: safeOpenApi(
        z.string(),
        {
          description: 'Thread ID (CUID)',
          example: 'ck9x8v7b600034l5r8jlkf0a2'
        }
      )
    })
  },
  responses: {
    204: {
      description: 'Thread deleted successfully'
    },
    404: {
      description: 'Thread not found',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    }
  }
});
