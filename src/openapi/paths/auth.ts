import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';
import { safeOpenApi } from '../../utils/openapi';
import { successResponseSchema, errorResponseSchema } from '../../utils/validation';

// Login request schema
const loginRequestSchema = z.object({
  email: z.string().email().openapi({
    description: 'User email address',
    example: 'user@example.com'
  }),
  password: z.string().min(8).openapi({
    description: 'User password (min 8 characters)',
    example: 'secretpassword123'
  })
}).openapi('LoginRequest');

// Login response schema
const loginResponseSchema = successResponseSchema.extend({
  data: z.object({
    token: z.string().openapi({
      description: 'JWT access token',
      example: 'eyJhbGciOiJIUzI1NiIs...'
    }),
    user: z.object({
      id: z.string().openapi({
        description: 'User ID',
        example: 'ck9x8v7b600034l5r8jlkf0a1'
      }),
      email: z.string().email().openapi({
        description: 'User email',
        example: 'user@example.com'
      }),
      name: z.string().openapi({
        description: 'User full name',
        example: 'John Doe'
      }),
      role: safeOpenApi(
        z.enum(['USER', 'ADMIN']),
        {
          description: 'User role',
          example: 'USER'
        }
      )
    }).openapi('UserInfo')
  }).openapi('LoginResponseData')
}).openapi('LoginResponse');

// Login route
export const loginRoute = createRoute({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['Auth'],
  summary: 'User Authentication',
  description: 'Authenticate user with email and password to obtain a JWT token',
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: loginResponseSchema
        }
      }
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    }
  }
});

// Session schema
const sessionSchema = z.object({
  id: z.string().openapi({
    description: 'Session ID',
    example: 'ck9x8v7b600034l5r8jlkf0a1'
  }),
  created_at: z.string().datetime().openapi({
    description: 'Session creation time',
    example: '2025-07-14T12:00:00Z'
  }),
  last_active: z.string().datetime().openapi({
    description: 'Last activity timestamp',
    example: '2025-07-14T12:30:00Z'
  }),
  user_agent: z.string().openapi({
    description: 'Client user agent string',
    example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...'
  }),
  ip_address: z.string().openapi({
    description: 'Client IP address',
    example: '192.168.1.1'
  })
}).openapi('Session');

// List sessions response
const listSessionsResponseSchema = successResponseSchema.extend({
  data: z.array(sessionSchema)
}).openapi('SessionListResponse');

// List sessions route
export const listSessionsRoute = createRoute({
  method: 'get',
  path: '/api/v1/auth/sessions',
  tags: ['Auth'],
  summary: 'List Active Sessions',
  description: 'List all active sessions for the authenticated user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of active sessions',
      content: {
        'application/json': {
          schema: listSessionsResponseSchema
        }
      }
    },
    401: {
      description: 'Unauthorized - Invalid or expired token',
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      }
    }
  }
});
