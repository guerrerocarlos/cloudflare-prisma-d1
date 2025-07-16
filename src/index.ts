import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getDatabaseClient } from './utils/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getCorrelationId 
} from './utils/response';
import { 
  authenticateUser, 
  authenticateWithRedirect, 
  optionalAuth,
  requireRole 
} from './middleware/auth';
import { userRoutes } from './routes/users';
import { threadRoutes } from './routes/threads';
import { messageRoutes } from './routes/messages';
import { artifactRoutes } from './routes/artifacts';
import { fileRoutes } from './routes/files';
import { reactionRoutes } from './routes/reactions';
import { authRoutes } from './routes/auth';

// OpenAPI documentation routes
import { api as openApiApp } from './openapi/index';

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  ALLOWED_DOMAINS?: string;
}

const app = new Hono<{ 
  Bindings: Env,
  Variables: {
    authenticatedUser?: import('./middleware/auth').AuthenticatedUser;
    jwtPayload?: import('./middleware/auth').JWTPayload;
  }
}>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return origin;
    
    // Allow any localhost on any port for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return origin;
    }
    
    // Allow 127.0.0.1 on any port for development
    if (origin.startsWith('http://127.0.0.1:') || origin.startsWith('https://127.0.0.1:')) {
      return origin;
    }
    
    // Allow rpotential.dev subdomains
    if (origin.endsWith('.rpotential.dev') || origin === 'https://rpotential.dev') {
      return origin;
    }
    
    // Deny all other origins
    return null;
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Accept', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  exposeHeaders: ['X-Correlation-ID'],
  maxAge: 86400,
  credentials: true
}));

// API version info
app.get('/api/v1', (c) => {
  return createSuccessResponse({
    version: '1.0.0',
    name: 'RPotential Experience Layer API',
    description: 'Backend API for the Chief Potential Officer System',
    documentation: 'https://experience.rpotential.dev/docs',
    endpoints: {
      me: '/api/v1/me',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      threads: '/api/v1/threads',
      messages: '/api/v1/messages',
      artifacts: '/api/v1/artifacts',
      files: '/api/v1/files',
      reactions: '/api/v1/reactions'
    }
  });
});

// Simple health check endpoint (non-OpenAPI)
app.get('/health', (c) => {
  return createSuccessResponse({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'development' // TODO: Make this dynamic
  });
});

// Mount route modules with authentication
// Auth routes (no authentication required for login/logout)
app.route('/api/v1', authRoutes);

// Protected API routes - require JWT authentication
app.use('/api/v1/*', authenticateWithRedirect);

// GET /api/v1/me - Get current user session (simplified endpoint)
app.get('/api/v1/me', async (c) => {
  try {
    const user = c.get('authenticatedUser');
    const jwtPayload = c.get('jwtPayload');

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
      avatarUrl: user.avatarUrl,
      domain: user.domain,
      session: {
        exp: jwtPayload?.exp,
        iat: jwtPayload?.iat,
        domain: jwtPayload?.domain
      }
    }, {
      correlation_id: getCorrelationId(c.req.raw)
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return createErrorResponse({
      status: 500,
      title: 'Internal Server Error',
      detail: 'Failed to get current user information'
    }, getCorrelationId(c.req.raw));
  }
});

// Admin-only routes
app.use('/api/v1/users', requireRole(['ADMIN']));

app.route('/api/v1', userRoutes);
app.route('/api/v1', threadRoutes);
app.route('/api/v1', messageRoutes);
app.route('/api/v1', artifactRoutes);
app.route('/api/v1', fileRoutes);
app.route('/api/v1', reactionRoutes);

// Mount OpenAPI documentation app
app.route('/', openApiApp);

// Legacy endpoints for backward compatibility (protected)
app.get('/users', authenticateUser, requireRole(['ADMIN']), async (c) => {
  try {
    const prisma = getDatabaseClient(c.env.DB);
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        nick: true,
        role: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    return createSuccessResponse(users, {
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
});

app.post('/users', authenticateUser, requireRole(['ADMIN']), async (c) => {
  try {
    const prisma = getDatabaseClient(c.env.DB);
    
    const body = await c.req.json();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        nick: body.nick,
        role: body.role || 'USER'
      },
      select: {
        id: true,
        email: true,
        name: true,
        nick: true,
        role: true,
        createdAt: true
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
});

// 404 handler
app.notFound((c) => {
  return createErrorResponse({
    status: 404,
    title: 'Not Found',
    detail: `The requested endpoint ${c.req.path} was not found`
  }, getCorrelationId(c.req.raw));
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return createErrorResponse({
    status: 500,
    title: 'Internal Server Error',
    detail: 'An unexpected error occurred'
  }, getCorrelationId(c.req.raw));
});

export default app;