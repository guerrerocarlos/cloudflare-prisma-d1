// Authentication API routes

import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabaseClient } from '../utils/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getCorrelationId 
} from '../utils/response';
import { validateBody } from '../middleware/validation';
import { authenticateUser, getCurrentUser } from '../middleware/auth';

export interface Env {
  DB: D1Database;
}

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  googleId: z.string().optional(),
  avatarUrl: z.string().url().optional()
});

const logoutSchema = z.object({
  token: z.string().optional() // Optional, will use current session if not provided
});

type LoginInput = z.infer<typeof loginSchema>;
type LogoutInput = z.infer<typeof logoutSchema>;

const authRoutes = new Hono<{ 
  Bindings: Env,
  Variables: {
    validatedBody: LoginInput | LogoutInput,
    authenticatedUser: any
  }
}>();

// POST /auth/login - Create or update user session
authRoutes.post(
  '/auth/login',
  validateBody(loginSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const loginData = c.get('validatedBody') as LoginInput;

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: loginData.email }
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: loginData.email,
            name: loginData.name || null,
            googleId: loginData.googleId || null,
            avatarUrl: loginData.avatarUrl || null,
            role: 'USER', // Default role
            lastLoginAt: new Date()
          }
        });
      } else {
        // Update existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: loginData.name || user.name,
            googleId: loginData.googleId || user.googleId,
            avatarUrl: loginData.avatarUrl || user.avatarUrl,
            lastLoginAt: new Date()
          }
        });
      }

      // Create new session
      const token = crypto.randomUUID() + '-' + Date.now().toString(36); // Generate a unique session token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: token,
          expiresAt: expiresAt
        }
      });

      return createSuccessResponse({
        token: session.token,
        expiresAt: session.expiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          nick: user.nick,
          role: user.role,
          avatarUrl: user.avatarUrl
        }
      });
    } catch (error) {
      console.error('Error during login:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to create user session'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// POST /auth/logout - Invalidate current session
authRoutes.post(
  '/auth/logout',
  authenticateUser,
  validateBody(logoutSchema),
  async (c) => {
    try {
      const prisma = getDatabaseClient(c.env.DB);
      const user = getCurrentUser(c);
      const logoutData = c.get('validatedBody') as LogoutInput;

      if (!user) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'No active session found'
        }, getCorrelationId(c.req.raw));
      }

      // Get the current session token
      const authHeader = c.req.header('Authorization');
      const currentToken = authHeader?.substring(7); // Remove 'Bearer ' prefix

      const tokenToDelete = logoutData.token || currentToken;

      if (!tokenToDelete) {
        return createErrorResponse({
          status: 400,
          title: 'Invalid Request',
          detail: 'No token provided for logout'
        }, getCorrelationId(c.req.raw));
      }

      // Delete the session
      await prisma.session.delete({
        where: { token: tokenToDelete }
      });

      return createSuccessResponse({
        message: 'Successfully logged out'
      });
    } catch (error) {
      console.error('Error during logout:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to logout'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// GET /auth/me - Get current user information
authRoutes.get(
  '/auth/me',
  authenticateUser,
  async (c) => {
    try {
      const user = getCurrentUser(c);

      if (!user) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'No active session found'
        }, getCorrelationId(c.req.raw));
      }

      return createSuccessResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        nick: user.nick,
        role: user.role,
        avatarUrl: user.avatarUrl
      });
    } catch (error) {
      console.error('Error getting user info:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to get user information'
      }, getCorrelationId(c.req.raw));
    }
  }
);

// GET /auth/sessions - List user's active sessions (admin only)
authRoutes.get(
  '/auth/sessions',
  authenticateUser,
  async (c) => {
    try {
      const user = getCurrentUser(c);

      if (!user) {
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: 'No active session found'
        }, getCorrelationId(c.req.raw));
      }

      // Only allow users to see their own sessions or admins to see all
      const prisma = getDatabaseClient(c.env.DB);
      
      let sessions;
      if (user.role === 'ADMIN') {
        // Admin can see all sessions
        sessions = await prisma.session.findMany({
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                nick: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      } else {
        // Regular users can only see their own sessions
        sessions = await prisma.session.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' }
        });
      }

      return createSuccessResponse({
        sessions: sessions.map(session => ({
          id: session.id,
          token: session.token.substring(0, 8) + '...', // Only show first 8 chars for security
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          user: 'user' in session ? session.user : undefined
        }))
      });
    } catch (error) {
      console.error('Error getting sessions:', error);
      return createErrorResponse({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Failed to get sessions'
      }, getCorrelationId(c.req.raw));
    }
  }
);

export { authRoutes };
