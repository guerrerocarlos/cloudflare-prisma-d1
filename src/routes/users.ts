// User API routes

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
  createUserSchema, 
  updateUserSchema, 
  paginationQuerySchema,
  cuidSchema 
} from '../utils/validation';
import type { CreateUserInput, UpdateUserInput, PaginationQuery } from '../utils/validation';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { getCurrentUser, requireCurrentUser } from '../middleware/auth';
import type { AuthenticatedUser, JWTPayload } from '../middleware/auth';

export interface Env {
  DB: D1Database;
}

// Parameter validation schemas
const userParamsSchema = z.object({
  id: cuidSchema
});

const userQuerySchema = paginationQuerySchema.extend({
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  search: z.string().optional()
});

type UserParams = z.infer<typeof userParamsSchema>;
type UserQuery = z.infer<typeof userQuerySchema>;

const userRoutes = new Hono<{ 
  Bindings: Env,
  Variables: {
    validatedBody: CreateUserInput | UpdateUserInput,
    validatedQuery: UserQuery,
    validatedParams: UserParams,
    authenticatedUser?: AuthenticatedUser;
    jwtPayload?: JWTPayload;
  }
}>();

// GET /users - List users with pagination and filtering
userRoutes.get(
  '/users',
  validateQuery(userQuerySchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const query = c.get('validatedQuery') as UserQuery;
      
      // Build where clause for filtering
      const where: any = {};
      if (query.email) {
        where.email = { contains: query.email };
      }
      if (query.role) {
        where.role = query.role;
      }
      if (query.search) {
        where.OR = [
          { email: { contains: query.search } },
          { name: { contains: query.search } },
          { nick: { contains: query.search } }
        ];
      }

      // Handle cursor-based pagination
      const queryOptions: any = {
        where,
        select: {
          id: true,
          email: true,
          name: true,
          nick: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
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

      const users = await prisma.user.findMany(queryOptions);
      
      // Check if there are more results
      const hasMore = users.length > query.limit;
      const items = hasMore ? users.slice(0, -1) : users;
      const continuationToken = hasMore ? items[items.length - 1].id : undefined;

      return createPaginatedResponse(items, {
        hasMore,
        continuationToken,
        pageSize: query.limit
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch users'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// GET /users/:id - Get user by ID
userRoutes.get(
  '/users/:id',
  validateParams(userParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as UserParams;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          nick: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        return createErrorResponse({
          status: 404,
          title: 'User Not Found',
          detail: `User with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      return createSuccessResponse(user, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch user'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// POST /users - Create new user
userRoutes.post(
  '/users',
  validateBody(createUserSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const userData = c.get('validatedBody') as CreateUserInput;

      // Check if user with email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        return createErrorResponse({
          status: 409,
          title: 'Conflict',
          detail: 'A user with this email already exists'
        }, getCorrelationId(c.req.raw));
      }

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          nick: userData.nick,
          role: userData.role || 'USER',
          googleId: userData.googleId,
          avatarUrl: userData.avatarUrl
        },
        select: {
          id: true,
          email: true,
          name: true,
          nick: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return createSuccessResponse(user, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to create user'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// PUT /users/:id - Update user
userRoutes.put(
  '/users/:id',
  validateParams(userParamsSchema),
  validateBody(updateUserSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as UserParams;
      const updateData = c.get('validatedBody') as UpdateUserInput;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return createErrorResponse({
          status: 404,
          title: 'User Not Found',
          detail: `User with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          nick: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return createSuccessResponse(user, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to update user'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// DELETE /users/:id - Delete user
userRoutes.delete(
  '/:id',
  validateParams(userParamsSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const { id } = c.get('validatedParams') as UserParams;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return createErrorResponse({
          status: 404,
          title: 'User Not Found',
          detail: `User with ID ${id} was not found`
        }, getCorrelationId(c.req.raw));
      }

      await prisma.user.delete({
        where: { id }
      });

      return createSuccessResponse({
        deleted: true,
        id
      }, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to delete user'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// GET /users/me - Get current user profile
userRoutes.get(
  '/users/me',
  async (c) => {
    try {
      const currentUser = getCurrentUser(c);
      
      if (!currentUser) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'You must be authenticated to access your profile'
        }, getCorrelationId(c.req.raw));
      }

      const prisma = getDatabaseClient(c.env.DB);
      
      // Get fresh user data from database
      const user = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          nick: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        return createErrorResponse({
          status: 404,
          title: 'User Not Found',
          detail: 'Your user profile was not found in the database'
        }, getCorrelationId(c.req.raw));
      }

      // Add JWT domain information to the response
      const jwtPayload = c.get('jwtPayload');
      const userProfile = {
        ...user,
        domain: currentUser.domain || jwtPayload?.domain
      };

      return createSuccessResponse(userProfile, {
        correlation_id: getCorrelationId(c.req.raw)
      });
    } catch (error) {
      console.error('Error fetching current user profile:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to fetch user profile'
      }, getCorrelationId(c.req.raw));
    }
  }
);

export { userRoutes };
