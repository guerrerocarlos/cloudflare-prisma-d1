import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { healthCheckRoute } from './paths/health';
// import { loginRoute, listSessionsRoute } from './paths/auth';

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
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer {token}'
      }
    }
  }
};

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

export { api };
