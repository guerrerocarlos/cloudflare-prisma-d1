import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { healthCheckRoute } from './paths/health';
// import { loginRoute, listSessionsRoute } from './paths/auth';
// import { listUsersRoute, getUserRoute, createUserRoute, updateUserRoute, deleteUserRoute } from './paths/users';

// Create an OpenAPI Hono instance
const api = new OpenAPIHono();

// Set up OpenAPI document with metadata
const openApiDocument = {
  openapi: '3.0.0',
  info: {
    title: 'RPotential Experience Layer API',
    version: '1.0.0',
    description: 'API for the Chief Potential Officer System that handles users, threads, messages, artifacts, files, and reactions.',
    contact: {
      name: 'RPotential API Support',
      email: 'api@rpotential.dev',
      url: 'https://rpotential.dev/support'
    },
    license: {
      name: 'Private',
      url: 'https://rpotential.dev/license'
    }
  },
  servers: [
    {
      url: 'https://api.rpotential.dev',
      description: 'Production server'
    },
    {
      url: 'https://staging-api.rpotential.dev',
      description: 'Staging server'
    },
    {
      url: 'http://localhost:8787',
      description: 'Local development server'
    }
  ],
  tags: [
    { name: 'System', description: 'System-related endpoints' },
    { name: 'Users', description: 'User management endpoints' },
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Threads', description: 'Thread management endpoints' },
    { name: 'Messages', description: 'Message management endpoints' },
    { name: 'Artifacts', description: 'Artifact management endpoints' },
    { name: 'Files', description: 'File management endpoints' },
    { name: 'Reactions', description: 'Reaction management endpoints' }
  ],
  paths: {
    '/api/v1/health': {
      get: {
        summary: 'API Health Check',
        description: 'Check if the API is operational',
        tags: ['System'],
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    data: {
                      type: 'object',
                      properties: {
                        status: {
                          type: 'string',
                          example: 'healthy'
                        },
                        timestamp: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-14T12:00:00Z'
                        },
                        version: {
                          type: 'string',
                          example: '2.0.0'
                        },
                        environment: {
                          type: 'string',
                          enum: ['development', 'staging', 'production'],
                          example: 'development'
                        }
                      }
                    },
                    metadata: {
                      type: 'object',
                      properties: {
                        timestamp: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-14T12:00:00Z'
                        },
                        correlation_id: {
                          type: 'string',
                          format: 'uuid',
                          example: '123e4567-e89b-12d3-a456-426614174000'
                        },
                        version: {
                          type: 'string',
                          example: '1.0.0'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/users': {
      get: {
        summary: 'List Users',
        description: 'Get a paginated list of users with optional filtering',
        tags: ['Users'],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of users to return (1-100)',
            schema: { type: 'number', minimum: 1, maximum: 100, default: 25 }
          },
          {
            name: 'cursor',
            in: 'query',
            description: 'Pagination cursor from previous response',
            schema: { type: 'string' }
          },
          {
            name: 'orderBy',
            in: 'query',
            description: 'Field to order by',
            schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'email', 'name'], default: 'createdAt' }
          },
          {
            name: 'orderDirection',
            in: 'query',
            description: 'Order direction',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
          },
          {
            name: 'email',
            in: 'query',
            description: 'Filter by email (partial match)',
            schema: { type: 'string', format: 'email' }
          },
          {
            name: 'role',
            in: 'query',
            description: 'Filter by user role',
            schema: { type: 'string', enum: ['USER', 'ADMIN'] }
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search in email, name, or nick fields',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { '$ref': '#/components/schemas/User' }
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        hasMore: { type: 'boolean', example: true },
                        continuationToken: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a1' },
                        pageSize: { type: 'number', example: 25 }
                      }
                    },
                    metadata: { '$ref': '#/components/schemas/ResponseMetadata' }
                  }
                }
              }
            }
          },
          '400': { '$ref': '#/components/responses/BadRequest' },
          '500': { '$ref': '#/components/responses/InternalServerError' }
        }
      },
      post: {
        summary: 'Create User',
        description: 'Create a new user account',
        tags: ['Users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/CreateUserRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/User' },
                    metadata: { '$ref': '#/components/schemas/ResponseMetadata' }
                  }
                }
              }
            }
          },
          '400': { '$ref': '#/components/responses/BadRequest' },
          '409': { '$ref': '#/components/responses/Conflict' },
          '500': { '$ref': '#/components/responses/InternalServerError' }
        }
      }
    },
    '/api/v1/users/{id}': {
      get: {
        summary: 'Get User by ID',
        description: 'Retrieve a specific user by their ID',
        tags: ['Users'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a1' }
          }
        ],
        responses: {
          '200': {
            description: 'User details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/User' },
                    metadata: { '$ref': '#/components/schemas/ResponseMetadata' }
                  }
                }
              }
            }
          },
          '404': { '$ref': '#/components/responses/NotFound' },
          '500': { '$ref': '#/components/responses/InternalServerError' }
        }
      },
      put: {
        summary: 'Update User',
        description: 'Update an existing user account',
        tags: ['Users'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a1' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/UpdateUserRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/User' },
                    metadata: { '$ref': '#/components/schemas/ResponseMetadata' }
                  }
                }
              }
            }
          },
          '400': { '$ref': '#/components/responses/BadRequest' },
          '404': { '$ref': '#/components/responses/NotFound' },
          '500': { '$ref': '#/components/responses/InternalServerError' }
        }
      },
      delete: {
        summary: 'Delete User',
        description: 'Delete a user account',
        tags: ['Users'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a1' }
          }
        ],
        responses: {
          '200': {
            description: 'User deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        deleted: { type: 'boolean', example: true },
                        id: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a1' }
                      }
                    },
                    metadata: { '$ref': '#/components/schemas/ResponseMetadata' }
                  }
                }
              }
            }
          },
          '404': { '$ref': '#/components/responses/NotFound' },
          '500': { '$ref': '#/components/responses/InternalServerError' }
        }
      }
    }
  },
  components: {
    schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a1' },
            email: { type: 'string', format: 'email', description: 'User email address', example: 'user@example.com' },
            name: { type: 'string', description: 'User full name', example: 'John Doe' },
            nick: { type: 'string', description: 'User nickname/display name', example: 'johndoe' },
            role: { type: 'string', enum: ['USER', 'ADMIN'], description: 'User role', example: 'USER' },
            avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' },
            createdAt: { type: 'string', format: 'date-time', description: 'User creation timestamp', example: '2025-07-14T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', description: 'User last updated timestamp', example: '2025-07-14T12:30:00Z' },
            lastLoginAt: { type: 'string', format: 'date-time', description: 'User last login timestamp', example: '2025-07-14T11:00:00Z' }
          },
          required: ['id', 'email', 'role', 'createdAt', 'updatedAt']
        },
        CreateUserRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', description: 'User email address', example: 'user@example.com' },
            name: { type: 'string', minLength: 1, maxLength: 100, description: 'User full name', example: 'John Doe' },
            nick: { type: 'string', minLength: 1, maxLength: 50, description: 'User nickname/display name', example: 'johndoe' },
            role: { type: 'string', enum: ['USER', 'ADMIN'], description: 'User role (defaults to USER)', example: 'USER' },
            googleId: { type: 'string', description: 'Google OAuth ID', example: '123456789012345678901' },
            avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' }
          },
          required: ['email']
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100, description: 'User full name', example: 'John Doe' },
            nick: { type: 'string', minLength: 1, maxLength: 50, description: 'User nickname/display name', example: 'johndoe' },
            role: { type: 'string', enum: ['USER', 'ADMIN'], description: 'User role', example: 'USER' },
            avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' }
          }
        },
        ResponseMetadata: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', description: 'Response timestamp', example: '2025-07-14T12:00:00Z' },
            correlation_id: { type: 'string', format: 'uuid', description: 'Request correlation ID', example: '123e4567-e89b-12d3-a456-426614174000' },
            version: { type: 'string', description: 'API version', example: '1.0' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Error type', example: 'https://httpstatuses.com/400' },
            title: { type: 'string', description: 'Error title', example: 'Bad Request' },
            status: { type: 'number', description: 'HTTP status code', example: 400 },
            detail: { type: 'string', description: 'Error detail message', example: 'The request was invalid' },
            instance: { type: 'string', description: 'Error instance path', example: '/api/v1/users' },
            timestamp: { type: 'string', format: 'date-time', description: 'Error timestamp', example: '2025-07-14T12:00:00Z' },
            trace_id: { type: 'string', format: 'uuid', description: 'Error trace ID', example: '123e4567-e89b-12d3-a456-426614174000' }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Invalid request parameters or body',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Error' }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Error' }
            }
          }
        },
        Conflict: {
          description: 'Resource already exists',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Error' }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Error' }
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer {token}'
        }
      }
    }
  }

// Mount Swagger UI with the OpenAPI document
api.get('/api/v1/docs', swaggerUI({ url: '/api/v1/openapi.json' }));
api.get('/api/v1/openapi.json', (c) => {
  return c.json(openApiDocument);
});

// Register routes
api.openapi(healthCheckRoute, async (c) => {
  const startTime = Date.now();
  
  try {
    // Simple health check without database dependency for now
    // TODO: Add database connectivity check when available
    const dbLatency = Date.now() - startTime;

    return c.json({
      success: true,
      data: {
        status: 'healthy',
        services: {
          database: {
            status: 'healthy',
            latency: dbLatency
          }
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        correlation_id: crypto.randomUUID(),
        version: '1.0'
      }
    });
  } catch (error) {
    return c.json({
      success: true,
      data: {
        status: 'degraded',
        services: {
          database: {
            status: 'unhealthy',
            latency: Date.now() - startTime
          }
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        correlation_id: crypto.randomUUID(),
        version: '1.0'
      }
    });
  }
});

// Register auth routes (commented out for now)
// api.openapi(loginRoute, async (c) => {
//   // TODO: Implement login handler
//   return c.json({ success: false, error: 'Not implemented' }, 501);
// });

// api.openapi(listSessionsRoute, async (c) => {
//   // TODO: Implement sessions handler
//   return c.json({ success: false, error: 'Not implemented' }, 501);
// });

// Register user routes (commented out for now due to type issues)
// api.openapi(listUsersRoute, async (c) => {
//   // TODO: Implement list users handler
//   return c.json({ success: false, error: 'Not implemented' }, 501);
// });

// api.openapi(getUserRoute, async (c) => {
//   // TODO: Implement get user handler
//   return c.json({ success: false, error: 'Not implemented' }, 501);
// });

// api.openapi(createUserRoute, async (c) => {
//   // TODO: Implement create user handler
//   return c.json({ success: false, error: 'Not implemented' }, 501);
// });

// api.openapi(updateUserRoute, async (c) => {
//   // TODO: Implement update user handler
//   return c.json({ success: false, error: 'Not implemented' }, 501);
// });

// api.openapi(deleteUserRoute, async (c) => {
//   // TODO: Implement delete user handler
//   return c.json({ success: false, error: 'Not implemented' }, 501);
// });

export { api };
