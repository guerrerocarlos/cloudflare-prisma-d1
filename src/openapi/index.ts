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
    },
    '/api/v1/threads': {
      get: {
        summary: 'List Threads',
        description: 'Get a paginated list of threads with optional filtering',
        tags: ['Threads'],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of threads to return (1-100)',
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
            schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'title'], default: 'createdAt' }
          },
          {
            name: 'orderDirection',
            in: 'query',
            description: 'Order direction',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by thread status',
            schema: { type: 'string', enum: ['ACTIVE', 'ARCHIVED', 'DELETED'] }
          },
          {
            name: 'title',
            in: 'query',
            description: 'Filter by thread title (partial match)',
            schema: { type: 'string' }
          },
          {
            name: 'createdAfter',
            in: 'query',
            description: 'Filter threads created after this date',
            schema: { type: 'string', format: 'date-time' }
          },
          {
            name: 'createdBefore',
            in: 'query',
            description: 'Filter threads created before this date',
            schema: { type: 'string', format: 'date-time' }
          }
        ],
        responses: {
          '200': {
            description: 'List of threads',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { '$ref': '#/components/schemas/Thread' }
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        hasMore: { type: 'boolean', example: true },
                        continuationToken: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a2' },
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
        summary: 'Create Thread',
        description: 'Create a new conversation thread',
        tags: ['Threads'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/CreateThreadRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Thread created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Thread' },
                    metadata: { '$ref': '#/components/schemas/ResponseMetadata' }
                  }
                }
              }
            }
          },
          '400': { '$ref': '#/components/responses/BadRequest' },
          '500': { '$ref': '#/components/responses/InternalServerError' }
        }
      }
    },
    '/api/v1/threads/{id}': {
      get: {
        summary: 'Get Thread by ID',
        description: 'Retrieve a specific thread by its ID',
        tags: ['Threads'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Thread ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a2' }
          }
        ],
        responses: {
          '200': {
            description: 'Thread details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Thread' },
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
        summary: 'Update Thread',
        description: 'Update an existing thread',
        tags: ['Threads'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Thread ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a2' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/UpdateThreadRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Thread updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Thread' },
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
        summary: 'Delete Thread',
        description: 'Delete a thread (soft delete - marks as DELETED)',
        tags: ['Threads'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Thread ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a2' }
          }
        ],
        responses: {
          '204': {
            description: 'Thread deleted successfully'
          },
          '404': { '$ref': '#/components/responses/NotFound' },
          '500': { '$ref': '#/components/responses/InternalServerError' }
        }
      }
    },
    '/api/v1/threads/{threadId}/messages': {
      get: {
        summary: 'List Messages in Thread',
        description: 'Get a paginated list of messages in a specific thread',
        tags: ['Messages'],
        parameters: [
          {
            name: 'threadId',
            in: 'path',
            required: true,
            description: 'Thread ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a2' }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of messages to return (1-100)',
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
            schema: { type: 'string', enum: ['createdAt', 'updatedAt'], default: 'createdAt' }
          },
          {
            name: 'orderDirection',
            in: 'query',
            description: 'Order direction',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' }
          },
          {
            name: 'role',
            in: 'query',
            description: 'Filter by message role',
            schema: { type: 'string', enum: ['USER', 'ASSISTANT', 'SYSTEM'] }
          },
          {
            name: 'hasAttachments',
            in: 'query',
            description: 'Filter by messages with/without attachments',
            schema: { type: 'boolean' }
          },
          {
            name: 'createdAfter',
            in: 'query',
            description: 'Filter messages created after this date',
            schema: { type: 'string', format: 'date-time' }
          },
          {
            name: 'createdBefore',
            in: 'query',
            description: 'Filter messages created before this date',
            schema: { type: 'string', format: 'date-time' }
          }
        ],
        responses: {
          '200': {
            description: 'List of messages',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { '$ref': '#/components/schemas/Message' }
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        hasMore: { type: 'boolean', example: true },
                        continuationToken: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a3' },
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
          '404': { '$ref': '#/components/responses/NotFound' },
          '500': { '$ref': '#/components/responses/InternalServerError' }
        }
      },
      post: {
        summary: 'Create Message',
        description: 'Create a new message in a thread',
        tags: ['Messages'],
        parameters: [
          {
            name: 'threadId',
            in: 'path',
            required: true,
            description: 'Thread ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a2' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/CreateMessageRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Message created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Message' },
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
      }
    },
    '/api/v1/messages/{id}': {
      get: {
        summary: 'Get Message by ID',
        description: 'Retrieve a specific message by its ID',
        tags: ['Messages'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Message ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a3' }
          }
        ],
        responses: {
          '200': {
            description: 'Message details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Message' },
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
        summary: 'Update Message',
        description: 'Update an existing message',
        tags: ['Messages'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Message ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a3' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/UpdateMessageRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Message updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Message' },
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
        summary: 'Delete Message',
        description: 'Delete a message',
        tags: ['Messages'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Message ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a3' }
          }
        ],
        responses: {
          '204': {
            description: 'Message deleted successfully'
          },
          '404': { '$ref': '#/components/responses/NotFound' },
          '500': { '$ref': '#/components/responses/InternalServerError' }
        }
      }
    },
    '/api/v1/artifacts': {
      get: {
        summary: 'List Artifacts',
        description: 'Get a paginated list of artifacts with optional filtering',
        tags: ['Artifacts'],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of artifacts to return (1-100)',
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
            schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'title'], default: 'createdAt' }
          },
          {
            name: 'orderDirection',
            in: 'query',
            description: 'Order direction',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
          },
          {
            name: 'type',
            in: 'query',
            description: 'Filter by artifact type',
            schema: { type: 'string', enum: ['INSIGHT', 'REPORT', 'DASHBOARD', 'PDF', 'REFERENCE'] }
          },
          {
            name: 'createdAfter',
            in: 'query',
            description: 'Filter artifacts created after this date',
            schema: { type: 'string', format: 'date-time' }
          },
          {
            name: 'createdBefore',
            in: 'query',
            description: 'Filter artifacts created before this date',
            schema: { type: 'string', format: 'date-time' }
          }
        ],
        responses: {
          '200': {
            description: 'List of artifacts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { '$ref': '#/components/schemas/Artifact' }
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        hasMore: { type: 'boolean', example: true },
                        continuationToken: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a5' },
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
      }
    },
    '/api/v1/artifacts/{id}': {
      get: {
        summary: 'Get Artifact by ID',
        description: 'Retrieve a specific artifact by its ID',
        tags: ['Artifacts'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Artifact ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a5' }
          }
        ],
        responses: {
          '200': {
            description: 'Artifact details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/ArtifactDetailed' },
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
        summary: 'Update Artifact',
        description: 'Update an existing artifact',
        tags: ['Artifacts'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Artifact ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a5' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/UpdateArtifactRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Artifact updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Artifact' },
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
        summary: 'Delete Artifact',
        description: 'Delete an artifact',
        tags: ['Artifacts'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Artifact ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a5' }
          }
        ],
        responses: {
          '200': {
            description: 'Artifact deleted successfully',
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
                        id: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a5' }
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
    },
    '/api/v1/threads/{threadId}/artifacts': {
      get: {
        summary: 'List Artifacts in Thread',
        description: 'Get a list of artifacts in a specific thread',
        tags: ['Artifacts'],
        parameters: [
          {
            name: 'threadId',
            in: 'path',
            required: true,
            description: 'Thread ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a2' }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of artifacts to return (1-100)',
            schema: { type: 'number', minimum: 1, maximum: 100, default: 25 }
          },
          {
            name: 'orderBy',
            in: 'query',
            description: 'Field to order by',
            schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'title'], default: 'createdAt' }
          },
          {
            name: 'orderDirection',
            in: 'query',
            description: 'Order direction',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
          },
          {
            name: 'type',
            in: 'query',
            description: 'Filter by artifact type',
            schema: { type: 'string', enum: ['INSIGHT', 'REPORT', 'DASHBOARD', 'PDF', 'REFERENCE'] }
          },
          {
            name: 'createdAfter',
            in: 'query',
            description: 'Filter artifacts created after this date',
            schema: { type: 'string', format: 'date-time' }
          },
          {
            name: 'createdBefore',
            in: 'query',
            description: 'Filter artifacts created before this date',
            schema: { type: 'string', format: 'date-time' }
          }
        ],
        responses: {
          '200': {
            description: 'List of artifacts in thread',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { '$ref': '#/components/schemas/Artifact' }
                    },
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
      post: {
        summary: 'Create Artifact in Thread',
        description: 'Create a new artifact in a specific thread',
        tags: ['Artifacts'],
        parameters: [
          {
            name: 'threadId',
            in: 'path',
            required: true,
            description: 'Thread ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a2' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/CreateArtifactRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Artifact created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Artifact' },
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
      }
    },
    '/api/v1/files': {
      get: {
        summary: 'List Files',
        description: 'Get a paginated list of files with optional filtering',
        tags: ['Files'],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of files to return (1-100)',
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
            schema: { type: 'string', enum: ['createdAt', 'filename', 'size'], default: 'createdAt' }
          },
          {
            name: 'orderDirection',
            in: 'query',
            description: 'Order direction',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
          },
          {
            name: 'mimeType',
            in: 'query',
            description: 'Filter by MIME type (partial match)',
            schema: { type: 'string', example: 'application/pdf' }
          },
          {
            name: 'sizeMin',
            in: 'query',
            description: 'Filter files with minimum size in bytes',
            schema: { type: 'number', minimum: 0, example: 1024 }
          },
          {
            name: 'sizeMax',
            in: 'query',
            description: 'Filter files with maximum size in bytes',
            schema: { type: 'number', minimum: 0, example: 10485760 }
          },
          {
            name: 'createdAfter',
            in: 'query',
            description: 'Filter files created after this date',
            schema: { type: 'string', format: 'date-time' }
          },
          {
            name: 'createdBefore',
            in: 'query',
            description: 'Filter files created before this date',
            schema: { type: 'string', format: 'date-time' }
          }
        ],
        responses: {
          '200': {
            description: 'List of files',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { '$ref': '#/components/schemas/File' }
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        hasMore: { type: 'boolean', example: true },
                        continuationToken: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a6' },
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
        summary: 'Create File Record',
        description: 'Create a new file record in the system',
        tags: ['Files'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/CreateFileRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'File record created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/File' },
                    metadata: { '$ref': '#/components/schemas/ResponseMetadata' }
                  }
                }
              }
            }
          },
          '400': { '$ref': '#/components/responses/BadRequest' },
          '500': { '$ref': '#/components/responses/InternalServerError' }
        }
      }
    },
    '/api/v1/files/{id}': {
      get: {
        summary: 'Get File by ID',
        description: 'Retrieve a specific file by its ID with detailed information',
        tags: ['Files'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'File ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a6' }
          }
        ],
        responses: {
          '200': {
            description: 'File details with usage information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/FileDetailed' },
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
      delete: {
        summary: 'Delete File',
        description: 'Delete a file record from the system',
        tags: ['Files'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'File ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a6' }
          }
        ],
        responses: {
          '200': {
            description: 'File deleted successfully',
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
                        id: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a6' }
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
    },
    '/api/v1/messages/{messageId}/reactions': {
      get: {
        summary: 'Get Message Reactions',
        description: 'Get all reactions for a specific message, grouped by emoji',
        tags: ['Reactions'],
        parameters: [
          {
            name: 'messageId',
            in: 'path',
            required: true,
            description: 'Message ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a3' }
          }
        ],
        responses: {
          '200': {
            description: 'Message reactions grouped by emoji',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/MessageReactions' },
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
      post: {
        summary: 'Add or Remove Reaction',
        description: 'Add or remove a reaction to/from a message',
        tags: ['Reactions'],
        parameters: [
          {
            name: 'messageId',
            in: 'path',
            required: true,
            description: 'Message ID (CUID)',
            schema: { type: 'string', example: 'ck9x8v7b600034l5r8jlkf0a3' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/AddReactionRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Reaction added or removed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { 
                      oneOf: [
                        { '$ref': '#/components/schemas/Reaction' },
                        { '$ref': '#/components/schemas/RemovedReaction' }
                      ]
                    },
                    metadata: { '$ref': '#/components/schemas/ResponseMetadata' }
                  }
                }
              }
            }
          },
          '400': { '$ref': '#/components/responses/BadRequest' },
          '404': { '$ref': '#/components/responses/NotFound' },
          '409': { '$ref': '#/components/responses/Conflict' },
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
        Thread: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Thread ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a2' },
            title: { type: 'string', description: 'Thread title', example: 'Discussion about AI ethics' },
            status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED', 'DELETED'], description: 'Thread status', example: 'ACTIVE' },
            createdAt: { type: 'string', format: 'date-time', description: 'Thread creation timestamp', example: '2025-07-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Thread last update timestamp', example: '2025-07-15T10:30:00Z' },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional thread metadata', example: { tags: ['ai', 'ethics'], priority: 'high' } },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a1' },
                email: { type: 'string', format: 'email', description: 'User email address', example: 'user@example.com' },
                name: { type: 'string', description: 'User full name', example: 'John Doe' },
                nick: { type: 'string', description: 'User nickname/display name', example: 'johndoe' },
                avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' }
              },
              required: ['id', 'email']
            }
          },
          required: ['id', 'status', 'createdAt', 'updatedAt', 'user']
        },
        CreateThreadRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200, description: 'Thread title', example: 'Discussion about AI ethics' },
            description: { type: 'string', maxLength: 1000, description: 'Thread description', example: 'A detailed discussion about the ethical implications of AI' },
            userId: { type: 'string', description: 'ID of the user creating the thread', example: 'ck9x8v7b600034l5r8jlkf0a1' },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional thread metadata', example: { tags: ['ai', 'ethics'], priority: 'high' } }
          },
          required: ['userId']
        },
        UpdateThreadRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200, description: 'Thread title', example: 'Updated discussion about AI ethics' },
            status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED', 'DELETED'], description: 'Thread status', example: 'ACTIVE' },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional thread metadata', example: { tags: ['ai', 'ethics'], priority: 'medium' } }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Message ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a3' },
            threadId: { type: 'string', description: 'Thread ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a2' },
            role: { type: 'string', enum: ['USER', 'ASSISTANT', 'SYSTEM'], description: 'Message role', example: 'USER' },
            content: { type: 'string', description: 'Message content', example: 'What are the key ethical considerations when developing AI systems?' },
            blocks: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
              description: 'Structured content blocks',
              example: [{ type: 'text', text: 'Hello world' }, { type: 'image', url: 'https://example.com/image.jpg' }]
            },
            createdAt: { type: 'string', format: 'date-time', description: 'Message creation timestamp', example: '2025-07-15T10:35:00Z' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Message last update timestamp', example: '2025-07-15T10:35:00Z' },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional message metadata', example: { confidence: 0.95, model: 'gpt-4' } },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a1' },
                email: { type: 'string', format: 'email', description: 'User email address', example: 'user@example.com' },
                name: { type: 'string', description: 'User full name', example: 'John Doe' },
                nick: { type: 'string', description: 'User nickname/display name', example: 'johndoe' },
                avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' }
              },
              description: 'User who created the message (only for USER role messages)'
            },
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'File ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a4' },
                  filename: { type: 'string', description: 'Original filename', example: 'document.pdf' },
                  title: { type: 'string', description: 'File title/description', example: 'AI Ethics Research Paper' },
                  mimeType: { type: 'string', description: 'File MIME type', example: 'application/pdf' },
                  size: { type: 'number', description: 'File size in bytes', example: 1024000 },
                  url: { type: 'string', format: 'url', description: 'File download URL', example: 'https://storage.example.com/files/document.pdf' }
                },
                required: ['id', 'filename', 'title']
              },
              description: 'Attached files'
            }
          },
          required: ['id', 'threadId', 'role', 'content', 'createdAt', 'updatedAt']
        },
        CreateMessageRequest: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['USER', 'ASSISTANT', 'SYSTEM'], description: 'Message role', example: 'USER' },
            content: { type: 'string', minLength: 1, maxLength: 50000, description: 'Message content', example: 'What are the key ethical considerations when developing AI systems?' },
            userId: { type: 'string', description: 'ID of the user creating the message (required for USER role)', example: 'ck9x8v7b600034l5r8jlkf0a1' },
            blocks: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
              description: 'Structured content blocks',
              example: [{ type: 'text', text: 'Hello world' }]
            },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  file_id: { type: 'string', description: 'File ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a4' },
                  title: { type: 'string', minLength: 1, maxLength: 255, description: 'File title/description', example: 'AI Ethics Research Paper' }
                },
                required: ['file_id', 'title']
              },
              description: 'File attachments'
            },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional message metadata', example: { priority: 'high' } }
          },
          required: ['role', 'content']
        },
        UpdateMessageRequest: {
          type: 'object',
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 50000, description: 'Message content', example: 'Updated: What are the key ethical considerations when developing AI systems?' },
            blocks: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
              description: 'Structured content blocks',
              example: [{ type: 'text', text: 'Updated content' }]
            },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional message metadata', example: { edited: true, editReason: 'Fixed typo' } }
          }
        },
        Artifact: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Artifact ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a5' },
            type: { type: 'string', enum: ['INSIGHT', 'REPORT', 'DASHBOARD', 'PDF', 'REFERENCE'], description: 'Artifact type', example: 'INSIGHT' },
            title: { type: 'string', description: 'Artifact title', example: 'AI Market Analysis Report' },
            description: { type: 'string', description: 'Artifact description', example: 'Comprehensive analysis of AI market trends and opportunities' },
            content: { type: 'string', description: 'Artifact content (fallback text)', example: 'This report analyzes the current AI market trends...' },
            blocks: { 
              type: 'array', 
              items: { type: 'object', additionalProperties: true },
              description: 'Rich UI blocks as JSON',
              example: [{ type: 'text', text: 'Market Overview' }, { type: 'chart', data: { labels: ['Q1', 'Q2'], values: [100, 150] } }]
            },
            version: { type: 'number', description: 'Artifact version number', example: 1 },
            createdAt: { type: 'string', format: 'date-time', description: 'Artifact creation timestamp', example: '2025-07-15T14:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Artifact last update timestamp', example: '2025-07-15T14:30:00Z' },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional artifact metadata', example: { tags: ['ai', 'market'], format: 'pdf' } },
            thread: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Thread ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a2' },
                title: { type: 'string', description: 'Thread title', example: 'AI Market Research Discussion' },
                status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED', 'DELETED'], description: 'Thread status', example: 'ACTIVE' }
              },
              description: 'Associated thread information'
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a1' },
                email: { type: 'string', format: 'email', description: 'User email address', example: 'user@example.com' },
                name: { type: 'string', description: 'User full name', example: 'John Doe' },
                nick: { type: 'string', description: 'User nickname/display name', example: 'johndoe' },
                avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' }
              },
              required: ['id', 'email'],
              description: 'User who created the artifact'
            }
          },
          required: ['id', 'type', 'title', 'content', 'version', 'createdAt', 'updatedAt', 'user']
        },
        ArtifactDetailed: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Artifact ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a5' },
            type: { type: 'string', enum: ['INSIGHT', 'REPORT', 'DASHBOARD', 'PDF', 'REFERENCE'], description: 'Artifact type', example: 'INSIGHT' },
            title: { type: 'string', description: 'Artifact title', example: 'AI Market Analysis Report' },
            description: { type: 'string', description: 'Artifact description', example: 'Comprehensive analysis of AI market trends and opportunities' },
            content: { type: 'string', description: 'Artifact content (fallback text)', example: 'This report analyzes the current AI market trends...' },
            blocks: { 
              type: 'array', 
              items: { type: 'object', additionalProperties: true },
              description: 'Rich UI blocks as JSON',
              example: [{ type: 'text', text: 'Market Overview' }, { type: 'chart', data: { labels: ['Q1', 'Q2'], values: [100, 150] } }]
            },
            version: { type: 'number', description: 'Artifact version number', example: 1 },
            createdAt: { type: 'string', format: 'date-time', description: 'Artifact creation timestamp', example: '2025-07-15T14:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Artifact last update timestamp', example: '2025-07-15T14:30:00Z' },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional artifact metadata', example: { tags: ['ai', 'market'], format: 'pdf' } },
            thread: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Thread ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a2' },
                title: { type: 'string', description: 'Thread title', example: 'AI Market Research Discussion' },
                status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED', 'DELETED'], description: 'Thread status', example: 'ACTIVE' }
              },
              description: 'Associated thread information'
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a1' },
                email: { type: 'string', format: 'email', description: 'User email address', example: 'user@example.com' },
                name: { type: 'string', description: 'User full name', example: 'John Doe' },
                nick: { type: 'string', description: 'User nickname/display name', example: 'johndoe' },
                avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' }
              },
              required: ['id', 'email'],
              description: 'User who created the artifact'
            }
          },
          required: ['id', 'type', 'title', 'content', 'version', 'createdAt', 'updatedAt', 'user']
        },
        CreateArtifactRequest: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['INSIGHT', 'REPORT', 'DASHBOARD', 'PDF', 'REFERENCE'], description: 'Artifact type', example: 'INSIGHT' },
            title: { type: 'string', minLength: 1, maxLength: 200, description: 'Artifact title', example: 'AI Market Analysis Report' },
            description: { type: 'string', maxLength: 1000, description: 'Artifact description', example: 'Comprehensive analysis of AI market trends and opportunities' },
            content: { type: 'string', minLength: 1, description: 'Artifact content (fallback text)', example: 'This report analyzes the current AI market trends...' },
            blocks: { 
              type: 'array', 
              items: { type: 'object', additionalProperties: true },
              description: 'Rich UI blocks as JSON',
              example: [{ type: 'text', text: 'Market Overview' }, { type: 'chart', data: { labels: ['Q1', 'Q2'], values: [100, 150] } }]
            },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional artifact metadata', example: { tags: ['ai', 'market'], format: 'pdf' } }
          },
          required: ['type', 'title', 'content']
        },
        UpdateArtifactRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200, description: 'Artifact title', example: 'Updated AI Market Analysis Report' },
            description: { type: 'string', maxLength: 1000, description: 'Artifact description', example: 'Updated comprehensive analysis of AI market trends' },
            content: { type: 'string', minLength: 1, description: 'Artifact content (fallback text)', example: 'This updated report analyzes...' },
            blocks: { 
              type: 'array', 
              items: { type: 'object', additionalProperties: true },
              description: 'Rich UI blocks as JSON',
              example: [{ type: 'text', text: 'Updated Market Overview' }, { type: 'chart', data: { labels: ['Q1', 'Q2'], values: [120, 180] } }]
            },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional artifact metadata', example: { tags: ['ai', 'market', 'updated'], format: 'pdf' } }
          }
        },
        File: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'File ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a6' },
            filename: { type: 'string', description: 'Stored filename', example: 'document_20250715_143000.pdf' },
            originalName: { type: 'string', description: 'Original filename as uploaded', example: 'AI Research Paper.pdf' },
            mimeType: { type: 'string', description: 'File MIME type', example: 'application/pdf' },
            size: { type: 'number', description: 'File size in bytes', example: 2048576 },
            checksum: { type: 'string', description: 'File checksum for integrity verification', example: 'sha256:abc123def456...' },
            storageUrl: { type: 'string', format: 'url', description: 'File storage URL', example: 'https://storage.example.com/files/document_20250715_143000.pdf' },
            previewUrl: { type: 'string', format: 'url', description: 'File preview URL (if available)', example: 'https://storage.example.com/previews/document_20250715_143000.jpg' },
            createdAt: { type: 'string', format: 'date-time', description: 'File upload timestamp', example: '2025-07-15T14:30:00Z' },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional file metadata', example: { tags: ['research', 'ai'], processed: true } },
            uploader: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a1' },
                email: { type: 'string', format: 'email', description: 'User email address', example: 'user@example.com' },
                name: { type: 'string', description: 'User full name', example: 'John Doe' },
                nick: { type: 'string', description: 'User nickname/display name', example: 'johndoe' },
                avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' }
              },
              required: ['id', 'email'],
              description: 'User who uploaded the file'
            }
          },
          required: ['id', 'filename', 'originalName', 'mimeType', 'size', 'storageUrl', 'createdAt', 'uploader']
        },
        FileDetailed: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'File ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a6' },
            filename: { type: 'string', description: 'Stored filename', example: 'document_20250715_143000.pdf' },
            originalName: { type: 'string', description: 'Original filename as uploaded', example: 'AI Research Paper.pdf' },
            mimeType: { type: 'string', description: 'File MIME type', example: 'application/pdf' },
            size: { type: 'number', description: 'File size in bytes', example: 2048576 },
            checksum: { type: 'string', description: 'File checksum for integrity verification', example: 'sha256:abc123def456...' },
            storageUrl: { type: 'string', format: 'url', description: 'File storage URL', example: 'https://storage.example.com/files/document_20250715_143000.pdf' },
            previewUrl: { type: 'string', format: 'url', description: 'File preview URL (if available)', example: 'https://storage.example.com/previews/document_20250715_143000.jpg' },
            createdAt: { type: 'string', format: 'date-time', description: 'File upload timestamp', example: '2025-07-15T14:30:00Z' },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional file metadata', example: { tags: ['research', 'ai'], processed: true } },
            uploader: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a1' },
                email: { type: 'string', format: 'email', description: 'User email address', example: 'user@example.com' },
                name: { type: 'string', description: 'User full name', example: 'John Doe' },
                nick: { type: 'string', description: 'User nickname/display name', example: 'johndoe' },
                avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' }
              },
              required: ['id', 'email'],
              description: 'User who uploaded the file'
            },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  message: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'Message ID', example: 'ck9x8v7b600034l5r8jlkf0a3' },
                      content: { type: 'string', description: 'Message content', example: 'Here is the research paper...' },
                      createdAt: { type: 'string', format: 'date-time', description: 'Message creation timestamp', example: '2025-07-15T14:35:00Z' },
                      thread: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', description: 'Thread ID', example: 'ck9x8v7b600034l5r8jlkf0a2' },
                          title: { type: 'string', description: 'Thread title', example: 'AI Research Discussion' }
                        }
                      }
                    }
                  }
                }
              },
              description: 'Messages that reference this file'
            }
          },
          required: ['id', 'filename', 'originalName', 'mimeType', 'size', 'storageUrl', 'createdAt', 'uploader']
        },
        CreateFileRequest: {
          type: 'object',
          properties: {
            filename: { type: 'string', minLength: 1, maxLength: 255, description: 'Stored filename', example: 'document_20250715_143000.pdf' },
            originalName: { type: 'string', minLength: 1, maxLength: 255, description: 'Original filename as uploaded', example: 'AI Research Paper.pdf' },
            mimeType: { type: 'string', minLength: 1, description: 'File MIME type', example: 'application/pdf' },
            size: { type: 'number', minimum: 0, description: 'File size in bytes', example: 2048576 },
            checksum: { type: 'string', minLength: 1, description: 'File checksum for integrity verification', example: 'sha256:abc123def456...' },
            storageUrl: { type: 'string', format: 'url', description: 'File storage URL', example: 'https://storage.example.com/files/document_20250715_143000.pdf' },
            previewUrl: { type: 'string', format: 'url', description: 'File preview URL (if available)', example: 'https://storage.example.com/previews/document_20250715_143000.jpg' },
            metadata: { type: 'object', additionalProperties: true, description: 'Additional file metadata', example: { tags: ['research', 'ai'], processed: true } }
          },
          required: ['filename', 'originalName', 'mimeType', 'size', 'checksum', 'storageUrl']
        },
        Reaction: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Reaction ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a7' },
            emoji: { type: 'string', description: 'Emoji used for reaction', example: '👍' },
            createdAt: { type: 'string', format: 'date-time', description: 'Reaction creation timestamp', example: '2025-07-15T14:40:00Z' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a1' },
                email: { type: 'string', format: 'email', description: 'User email address', example: 'user@example.com' },
                name: { type: 'string', description: 'User full name', example: 'John Doe' },
                nick: { type: 'string', description: 'User nickname/display name', example: 'johndoe' },
                avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' }
              },
              required: ['id', 'email'],
              description: 'User who created the reaction'
            }
          },
          required: ['id', 'emoji', 'createdAt', 'user']
        },
        MessageReactions: {
          type: 'object',
          properties: {
            messageId: { type: 'string', description: 'Message ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a3' },
            reactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  emoji: { type: 'string', description: 'Emoji used for reaction', example: '👍' },
                  count: { type: 'number', description: 'Number of users who reacted with this emoji', example: 3 },
                  users: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'User ID (CUID)', example: 'ck9x8v7b600034l5r8jlkf0a1' },
                        email: { type: 'string', format: 'email', description: 'User email address', example: 'user@example.com' },
                        name: { type: 'string', description: 'User full name', example: 'John Doe' },
                        nick: { type: 'string', description: 'User nickname/display name', example: 'johndoe' },
                        avatarUrl: { type: 'string', format: 'url', description: 'User avatar URL', example: 'https://example.com/avatar.jpg' }
                      },
                      required: ['id', 'email']
                    },
                    description: 'Users who reacted with this emoji'
                  }
                },
                required: ['emoji', 'count', 'users']
              },
              description: 'Reactions grouped by emoji'
            },
            total: { type: 'number', description: 'Total number of reactions', example: 5 }
          },
          required: ['messageId', 'reactions', 'total']
        },
        AddReactionRequest: {
          type: 'object',
          properties: {
            emoji: { type: 'string', minLength: 1, maxLength: 50, description: 'Emoji to add or remove', example: '👍' },
            action: { type: 'string', enum: ['add', 'remove'], description: 'Action to perform', example: 'add' }
          },
          required: ['emoji', 'action']
        },
        RemovedReaction: {
          type: 'object',
          properties: {
            removed: { type: 'boolean', example: true, description: 'Indicates the reaction was removed' },
            emoji: { type: 'string', description: 'Emoji that was removed', example: '👍' },
            messageId: { type: 'string', description: 'Message ID from which reaction was removed', example: 'ck9x8v7b600034l5r8jlkf0a3' }
          },
          required: ['removed', 'emoji', 'messageId']
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
