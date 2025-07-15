// Authentication middleware for API endpoints

import { Context, Next } from 'hono';
import { createErrorResponse, getCorrelationId } from '../utils/response';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  nick: string | null;
  role: string;
  avatarUrl: string | null;
  domain?: string;
}

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  name: string;
  domain: string;
  exp?: number; // Expiration timestamp
  iat?: number; // Issued at timestamp
  [key: string]: any;
}

/**
 * Extract user information from JWT cookie (rpotential_auth)
 */
export async function authenticateUser(c: Context, next: Next) {
  try {
    const cookieHeader = c.req.header('Cookie');
    
    if (!cookieHeader) {
      return createErrorResponse({
        status: 401,
        title: 'Authentication Required',
        detail: 'No authentication cookie found'
      }, getCorrelationId(c.req.raw));
    }

    // Extract rpotential_auth cookie
    const cookies = parseCookies(cookieHeader);
    const authToken = cookies.rpotential_auth;

    if (!authToken) {
      return createErrorResponse({
        status: 401,
        title: 'Authentication Required',
        detail: 'No auth token found in cookies'
      }, getCorrelationId(c.req.raw));
    }

    // Verify JWT
    const jwtSecret = c.env.JWT_SECRET || 'your-jwt-secret-key';
    const payload = await verifyJWT(authToken, jwtSecret);

    if (!payload) {
      return createErrorResponse({
        status: 401,
        title: 'Invalid Token',
        detail: 'The provided authentication token is invalid'
      }, getCorrelationId(c.req.raw));
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return createErrorResponse({
        status: 401,
        title: 'Token Expired',
        detail: 'The authentication token has expired. Please log in again.'
      }, getCorrelationId(c.req.raw));
    }

    // Verify domain (optional additional check)
    const allowedDomains = c.env.ALLOWED_DOMAINS ? 
      c.env.ALLOWED_DOMAINS.split(',') : 
      ['rpotential.ai', 'globant.com'];
    
    if (!allowedDomains.includes(payload.domain)) {
      return createErrorResponse({
        status: 403,
        title: 'Domain Not Allowed',
        detail: `Domain ${payload.domain} is not allowed to access this API`
      }, getCorrelationId(c.req.raw));
    }

    // Set the authenticated user in the context
    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || null,
      nick: null, // Can be extended if available in JWT
      role: payload.role || 'USER', // Default role if not in JWT
      avatarUrl: payload.avatar_url || null,
      domain: payload.domain
    };

    c.set('authenticatedUser', user);
    c.set('jwtPayload', payload);
    
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

/**
 * Optional authentication middleware (for endpoints that can work with or without auth)
 */
export async function optionalAuth(c: Context, next: Next) {
  try {
    const cookieHeader = c.req.header('Cookie');
    
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      const authToken = cookies.rpotential_auth;
      
      if (authToken) {
        const jwtSecret = c.env.JWT_SECRET || 'your-jwt-secret-key';
        const payload = await verifyJWT(authToken, jwtSecret);

        if (payload) {
          // Check expiration
          const now = Math.floor(Date.now() / 1000);
          if (!payload.exp || payload.exp >= now) {
            // Verify domain
            const allowedDomains = c.env.ALLOWED_DOMAINS ? 
              c.env.ALLOWED_DOMAINS.split(',') : 
              ['rpotential.ai', 'globant.com'];
            
            if (allowedDomains.includes(payload.domain)) {
              const user: AuthenticatedUser = {
                id: payload.sub,
                email: payload.email,
                name: payload.name || null,
                nick: null,
                role: payload.role || 'USER',
                avatarUrl: payload.avatar_url || null,
                domain: payload.domain
              };

              c.set('authenticatedUser', user);
              c.set('jwtPayload', payload);
            }
          }
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

/**
 * Authentication middleware with redirect for browser requests
 * This mimics the CloudFlare Pages function behavior
 */
export async function authenticateWithRedirect(c: Context, next: Next) {
  try {
    const authResult = await verifyAuthFromRequest(c);

    if (!authResult.isValid) {
      // Check if this is an API request (has JSON Accept header or is preflight)
      const acceptHeader = c.req.header('Accept') || '';
      const isApiRequest = acceptHeader.includes('application/json') || 
                          c.req.method === 'OPTIONS';

      if (isApiRequest) {
        // Return JSON error for API requests
        return createErrorResponse({
          status: 401,
          title: 'Authentication Required',
          detail: authResult.error || 'Authentication is required to access this endpoint'
        }, getCorrelationId(c.req.raw));
      } else {
        // Redirect to auth service for browser requests
        const redirectUrl = `https://auth.rpotential.dev/auth?redirect_uri=${encodeURIComponent(c.req.url)}`;
        return c.redirect(redirectUrl, 302);
      }
    }

    // Set the authenticated user in the context
    c.set('authenticatedUser', authResult.user);
    if (authResult.token) {
      c.set('jwtPayload', authResult.token);
    }
    
    await next();
  } catch (error) {
    console.error('Authentication with redirect error:', error);
    return createErrorResponse({
      status: 500,
      title: 'Authentication Error',
      detail: 'An error occurred during authentication'
    }, getCorrelationId(c.req.raw));
  }
}

/**
 * Verify authentication from request (supports both cookie and Bearer token)
 */
async function verifyAuthFromRequest(c: Context): Promise<{
  isValid: boolean;
  error?: string;
  user?: AuthenticatedUser;
  token?: JWTPayload;
}> {
  try {
    // First try cookie authentication
    const cookieHeader = c.req.header('Cookie');
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      const authToken = cookies.rpotential_auth;

      if (authToken) {
        const jwtSecret = c.env.JWT_SECRET || 'your-jwt-secret-key';
        const payload = await verifyJWT(authToken, jwtSecret);

        if (payload) {
          // Check expiration
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            return { isValid: false, error: 'Token expired' };
          }

          // Verify domain
          const allowedDomains = c.env.ALLOWED_DOMAINS ? 
            c.env.ALLOWED_DOMAINS.split(',') : 
            ['rpotential.ai', 'globant.com'];
          
          if (!allowedDomains.includes(payload.domain)) {
            return { isValid: false, error: 'Domain not allowed' };
          }

          const user: AuthenticatedUser = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || null,
            nick: null,
            role: payload.role || 'USER',
            avatarUrl: payload.avatar_url || null,
            domain: payload.domain
          };

          return {
            isValid: true,
            user,
            token: payload
          };
        }
      }
    }

    // Fallback to Bearer token authentication (for API clients)
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        const jwtSecret = c.env.JWT_SECRET || 'your-jwt-secret-key';
        const payload = await verifyJWT(token, jwtSecret);

        if (payload) {
          // Check expiration
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            return { isValid: false, error: 'Token expired' };
          }

          // Verify domain
          const allowedDomains = c.env.ALLOWED_DOMAINS ? 
            c.env.ALLOWED_DOMAINS.split(',') : 
            ['rpotential.ai', 'globant.com'];
          
          if (!allowedDomains.includes(payload.domain)) {
            return { isValid: false, error: 'Domain not allowed' };
          }

          const user: AuthenticatedUser = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || null,
            nick: null,
            role: payload.role || 'USER',
            avatarUrl: payload.avatar_url || null,
            domain: payload.domain
          };

          return {
            isValid: true,
            user,
            token: payload
          };
        }
      }
    }

    return { isValid: false, error: 'No valid authentication found' };

  } catch (error) {
    return { isValid: false, error: error instanceof Error ? error.message : 'Authentication error' };
  }
}

/**
 * Parse cookies from header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

/**
 * Verify JWT token
 */
async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');

    if (!headerB64 || !payloadB64 || !signatureB64) {
      throw new Error('Invalid token format');
    }

    // Verify signature
    const signatureInput = `${headerB64}.${payloadB64}`;
    const expectedSignature = await sign(signatureInput, secret);

    if (signatureB64 !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as JWTPayload;
    return payload;

  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Sign data with HMAC-SHA256
 */
async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(data: Uint8Array | string): string {
  if (typeof data === 'string') {
    data = new TextEncoder().encode(data);
  }

  let base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4);
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // Decode
  return atob(str);
}
