// Authentication middleware for API endpoints

import { Context, Next } from 'hono';
import { getDatabaseClient } from '../utils/database';
import { createErrorResponse, getCorrelationId } from '../utils/response';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  nick: string | null;
  role: string;
  avatarUrl: string | null;
}

// Extract user information from Authorization header
export async function authenticateUser(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse({
        status: 401,
        title: 'Authentication Required',
        detail: 'Missing or invalid Authorization header. Expected format: Bearer <token>'
      }, getCorrelationId(c.req.raw));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return createErrorResponse({
        status: 401,
        title: 'Authentication Required',
        detail: 'Missing authentication token'
      }, getCorrelationId(c.req.raw));
    }

    // In a real implementation, this would validate the JWT token
    // For now, we'll implement a simple token-based authentication
    const prisma = getDatabaseClient(c.env.DB);
    
    // Look up the session by token
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nick: true,
            role: true,
            avatarUrl: true
          }
        }
      }
    });

    if (!session) {
      return createErrorResponse({
        status: 401,
        title: 'Invalid Token',
        detail: 'The provided authentication token is invalid or expired'
      }, getCorrelationId(c.req.raw));
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      return createErrorResponse({
        status: 401,
        title: 'Token Expired',
        detail: 'The authentication token has expired. Please log in again.'
      }, getCorrelationId(c.req.raw));
    }

    // Set the authenticated user in the context
    c.set('authenticatedUser', session.user as AuthenticatedUser);
    
    await next();
  } catch (error) {
    console.error('Authentication error:', error);
    return createErrorResponse({
      status: 500,
      title: 'Authentication Error',
      detail: 'An error occurred during authentication'
    }, getCorrelationId(c.req.raw));
  }
}

// Optional authentication middleware (for endpoints that can work with or without auth)
export async function optionalAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        const prisma = getDatabaseClient(c.env.DB);
        
        const session = await prisma.session.findUnique({
          where: { token },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                nick: true,
                role: true,
                avatarUrl: true
              }
            }
          }
        });

        if (session && new Date() <= session.expiresAt) {
          c.set('authenticatedUser', session.user as AuthenticatedUser);
        }
      }
    }
    
    await next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Don't fail the request for optional auth errors
    await next();
  }
}

// Role-based access control middleware
export function requireRole(allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('authenticatedUser') as AuthenticatedUser;
    
    if (!user) {
      return createErrorResponse({
        status: 401,
        title: 'Authentication Required',
        detail: 'Authentication is required to access this endpoint'
      }, getCorrelationId(c.req.raw));
    }

    if (!allowedRoles.includes(user.role)) {
      return createErrorResponse({
        status: 403,
        title: 'Insufficient Permissions',
        detail: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      }, getCorrelationId(c.req.raw));
    }

    await next();
  };
}

// Utility function to get the current authenticated user
export function getCurrentUser(c: Context): AuthenticatedUser | null {
  return c.get('authenticatedUser') || null;
}

// Utility function to require authenticated user (throws if not authenticated)
export function requireCurrentUser(c: Context): AuthenticatedUser {
  const user = c.get('authenticatedUser');
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
