// User validation utilities

import { getDatabaseClient } from './database';
import { createErrorResponse, getCorrelationId } from './response';
import type { AuthenticatedUser } from '../middleware/auth';
import type { Context } from 'hono';

export interface Env {
  DB: D1Database;
}

/**
 * Validates that an authenticated user exists in the database
 * @param user - The authenticated user from the JWT
 * @param db - The database client
 * @returns Promise<boolean> - True if user exists, false otherwise
 */
export async function validateUserExists(user: AuthenticatedUser, db: D1Database): Promise<boolean> {
  try {
    const prisma = getDatabaseClient(db);
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true }
    });
    
    return !!dbUser;
  } catch (error) {
    console.error('Error validating user existence:', error);
    return false;
  }
}

/**
 * Middleware-like function to validate user existence and return error response if not found
 * @param c - Hono context
 * @param user - The authenticated user
 * @returns Promise<Response | null> - Error response if user doesn't exist, null if valid
 */
export async function validateUserExistsOrError(c: Context, user: AuthenticatedUser): Promise<Response | null> {
  const userExists = await validateUserExists(user, c.env.DB);
  
  if (!userExists) {
    return createErrorResponse({
      status: 401,
      title: 'User Not Found',
      detail: 'The authenticated user does not exist in the database'
    }, getCorrelationId(c.req.raw));
  }
  
  return null;
}

/**
 * Gets the full user data from the database for an authenticated user
 * @param user - The authenticated user from the JWT
 * @param db - The database client
 * @returns Promise<User | null> - Full user data or null if not found
 */
export async function getFullUserData(user: AuthenticatedUser, db: D1Database) {
  try {
    const prisma = getDatabaseClient(db);
    return await prisma.user.findUnique({
      where: { id: user.id },
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
  } catch (error) {
    console.error('Error fetching full user data:', error);
    return null;
  }
}
