import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';
import { safeOpenApi } from '../../utils/openapi';
import { successResponseSchema, errorResponseSchema } from '../../utils/validation';

// User object schema
const userSchema = z.object({
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
  role: safeOpenApi(
    z.enum(['USER', 'ADMIN']),
    {
      description: 'User role',
      example: 'USER'
    }
  ),
  avatarUrl: safeOpenApi(
    z.string().url().optional(),
    {
      description: 'User avatar URL',
      example: 'https://example.com/avatar.jpg'
    }
  ),
  createdAt: safeOpenApi(
    z.string().datetime(),
    {
      description: 'User creation timestamp',
      example: '2025-07-14T12:00:00Z'
    }
  ),
  updatedAt: safeOpenApi(
    z.string().datetime(),
    {
      description: 'User last updated timestamp',
      example: '2025-07-14T12:30:00Z'
    }
  ),
  lastLoginAt: safeOpenApi(
    z.string().datetime().optional(),
    {
      description: 'User last login timestamp',
      example: '2025-07-14T11:00:00Z'
    }
  )
});

// Create user request schema
const createUserRequestSchema = z.object({
  email: safeOpenApi(
    z.string().email(),
    {
      description: 'User email address',
      example: 'user@example.com'
    }
  ),
  name: safeOpenApi(
    z.string().min(1).max(100).optional(),
    {
      description: 'User full name',
      example: 'John Doe'
    }
  ),
  nick: safeOpenApi(
    z.string().min(1).max(50).optional(),
    {
      description: 'User nickname/display name',
      example: 'johndoe'
    }
  ),
  role: safeOpenApi(
    z.enum(['USER', 'ADMIN']).optional(),
    {
      description: 'User role (defaults to USER)',
      example: 'USER'
    }
  ),
  googleId: safeOpenApi(
    z.string().optional(),
    {
      description: 'Google OAuth ID',
      example: '123456789012345678901'
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

// Update user request schema
const updateUserRequestSchema = z.object({
  name: safeOpenApi(
    z.string().min(1).max(100).optional(),
    {
      description: 'User full name',
      example: 'John Doe'
    }
  ),
  nick: safeOpenApi(
    z.string().min(1).max(50).optional(),
    {
      description: 'User nickname/display name',
      example: 'johndoe'
    }
  ),
  role: safeOpenApi(
    z.enum(['USER', 'ADMIN']).optional(),
    {
      description: 'User role',
      example: 'USER'
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

// Paginated users response schema
const usersListResponseSchema = successResponseSchema.extend({
  data: z.array(userSchema),
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
        example: 'ck9x8v7b600034l5r8jlkf0a1'
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

// Single user response schema
const userResponseSchema = successResponseSchema.extend({
  data: userSchema
});

// Delete user response schema
const deleteUserResponseSchema = successResponseSchema.extend({
  data: z.object({
    deleted: safeOpenApi(
      z.boolean(),
      {
        description: 'Confirmation that user was deleted',
        example: true
      }
    ),
    id: safeOpenApi(
      z.string(),
      {
        description: 'ID of deleted user',
        example: 'ck9x8v7b600034l5r8jlkf0a1'
      }
    )
  })
});

// List users route
export const listUsersRoute = createRoute({
  method: 'get',
  path: '/api/v1/users',
  tags: ['Users'],
  summary: 'List Users',
  description: 'Get a paginated list of users with optional filtering',
  request: {
    query: z.object({
      limit: safeOpenApi(
        z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
        {
          description: 'Maximum number of users to return (1-100)',
          example: '25'
        }
      ),
      cursor: safeOpenApi(
        z.string().optional(),
        {
          description: 'Pagination cursor from previous response',
          example: 'ck9x8v7b600034l5r8jlkf0a1'
        }
      ),
      orderBy: safeOpenApi(
        z.enum(['createdAt', 'updatedAt', 'email', 'name']).optional(),
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
      email: safeOpenApi(
        z.string().email().optional(),
        {
          description: 'Filter by email (partial match)',
          example: 'john@example.com'
        }
      ),
      role: safeOpenApi(
        z.enum(['USER', 'ADMIN']).optional(),
        {
          description: 'Filter by user role',
          example: 'USER'
        }
      ),
      search: safeOpenApi(
        z.string().optional(),
        {
          description: 'Search in email, name, or nick fields',
          example: 'john'
        }
      )
    })
  },
  responses: {
    200: {
      description: 'List of users',
      content: {
        'application/json': {
          schema: usersListResponseSchema
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

// Get user by ID route
export const getUserRoute = createRoute({
  method: 'get',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: 'Get User by ID',
  description: 'Retrieve a specific user by their ID',
  request: {
    params: z.object({
      id: safeOpenApi(
        z.string(),
        {
          description: 'User ID (CUID)',
          example: 'ck9x8v7b600034l5r8jlkf0a1'
        }
      )
    })
  },
  responses: {
    200: {
      description: 'User details',
      content: {
        'application/json': {
          schema: userResponseSchema
        }
      }
    },
    404: {
      description: 'User not found',
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

// Create user route
export const createUserRoute = createRoute({
  method: 'post',
  path: '/api/v1/users',
  tags: ['Users'],
  summary: 'Create User',
  description: 'Create a new user account',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createUserRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: userResponseSchema
        }
      }
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    },
    409: {
      description: 'User with email already exists',
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

// Update user route
export const updateUserRoute = createRoute({
  method: 'put',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: 'Update User',
  description: 'Update an existing user account',
  request: {
    params: z.object({
      id: safeOpenApi(
        z.string(),
        {
          description: 'User ID (CUID)',
          example: 'ck9x8v7b600034l5r8jlkf0a1'
        }
      )
    }),
    body: {
      content: {
        'application/json': {
          schema: updateUserRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: userResponseSchema
        }
      }
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    },
    404: {
      description: 'User not found',
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

// Delete user route
export const deleteUserRoute = createRoute({
  method: 'delete',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: 'Delete User',
  description: 'Delete a user account',
  request: {
    params: z.object({
      id: safeOpenApi(
        z.string(),
        {
          description: 'User ID (CUID)',
          example: 'ck9x8v7b600034l5r8jlkf0a1'
        }
      )
    })
  },
  responses: {
    200: {
      description: 'User deleted successfully',
      content: {
        'application/json': {
          schema: deleteUserResponseSchema
        }
      }
    },
    404: {
      description: 'User not found',
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
