import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';
import { safeOpenApi } from '../../utils/openapi';
import { successResponseSchema } from '../../utils/validation';

// Health check response schema
const healthCheckResponseSchema = successResponseSchema.extend({
  data: z.object({
    status: safeOpenApi(
      z.enum(['healthy', 'degraded']),
      {
        description: 'Overall system health status',
        example: 'healthy'
      }
    ),
    timestamp: safeOpenApi(
      z.string().datetime(),
      {
        description: 'Current server timestamp',
        example: '2025-07-14T12:00:00Z'
      }
    ),
    version: safeOpenApi(
      z.string(),
      {
        description: 'API version',
        example: 'v1'
      }
    ),
    services: z.object({
      database: z.object({
        status: safeOpenApi(
          z.enum(['healthy', 'unhealthy']),
          {
            description: 'Database connection status',
            example: 'healthy'
          }
        ),
        latency: safeOpenApi(
          z.number(),
          {
            description: 'Database connection latency in milliseconds',
            example: 42
          }
        )
      })
    })
  })
});

// Health check route
export const healthCheckRoute = createRoute({
  method: 'get',
  path: '/api/v1/health',
  tags: ['System'],
  summary: 'System Health Check',
  description: 'Check the health status of the API and its dependencies',
  responses: {
    200: {
      description: 'System health information',
      content: {
        'application/json': {
          schema: healthCheckResponseSchema
        }
      }
    }
  }
});
