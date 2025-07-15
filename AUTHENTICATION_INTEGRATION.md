# JWT Authentication Integration

This document describes how the JWT authentication has been integrated into the Hono backend.

## Overview

The authentication system now supports:
- JWT cookie-based authentication (`rpotential_auth` cookie)
- Bearer token authentication (for API clients)
- Domain validation (rpotential.ai, globant.com)
- Automatic redirects for unauthenticated browser requests
- Role-based access control

## Integration Points

### 1. Main Application (`src/index.ts`)

The main Hono app now includes authentication middleware:

```typescript
// Protected API routes - require JWT authentication
app.use('/api/v1/users*', authenticateUser);
app.use('/api/v1/threads*', authenticateUser);
app.use('/api/v1/messages*', authenticateUser);
app.use('/api/v1/artifacts*', authenticateUser);
app.use('/api/v1/files*', authenticateUser);
app.use('/api/v1/reactions*', authenticateUser);

// Admin-only routes
app.use('/api/v1/users', requireRole(['ADMIN']));
```

### 2. Authentication Middleware (`src/middleware/auth.ts`)

Three main middleware functions:

- `authenticateUser`: Requires valid JWT, returns 401 if not authenticated
- `optionalAuth`: Adds user info if authenticated, but doesn't require it
- `authenticateWithRedirect`: Redirects browser requests to auth service, returns 401 for API requests

### 3. Route Updates

Routes now have access to:
- `c.get('authenticatedUser')`: Current authenticated user information
- `c.get('jwtPayload')`: Raw JWT payload data

Example usage in routes:
```typescript
const currentUser = getCurrentUser(c);
const jwtPayload = c.get('jwtPayload');
```

## Environment Variables

Required environment variables:
- `JWT_SECRET`: Secret key for JWT verification
- `ALLOWED_DOMAINS`: Comma-separated list of allowed domains (optional, defaults to 'rpotential.ai,globant.com')

## API Endpoints

### Authentication Endpoints

- `GET /api/v1/auth/verify`: Verify JWT token validity
- `GET /api/v1/auth/me`: Get current user information
- `POST /api/v1/auth/login`: Legacy session-based login (still available)
- `POST /api/v1/auth/logout`: Legacy session-based logout (still available)

### User Endpoints

- `GET /api/v1/users/me`: Get current user's profile (uses JWT authentication)
- `GET /api/v1/users`: List users (admin only)
- `POST /api/v1/users`: Create user (admin only)

## Testing Authentication

### With Cookie (Browser)

```bash
# Set cookie in browser and visit protected endpoint
curl -H "Cookie: rpotential_auth=<jwt_token>" \
     http://localhost:8787/api/v1/users/me
```

### With Bearer Token (API)

```bash
# Use Authorization header
curl -H "Authorization: Bearer <jwt_token>" \
     http://localhost:8787/api/v1/users/me
```

### Unauthenticated Request

```bash
# Browser request - will redirect to auth service
curl -H "Accept: text/html" \
     http://localhost:8787/api/v1/users/me

# API request - will return 401 JSON
curl -H "Accept: application/json" \
     http://localhost:8787/api/v1/users/me
```

## JWT Token Structure

The JWT token should contain:
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "domain": "rpotential.ai",
  "role": "USER",
  "exp": 1234567890,
  "iat": 1234567890
}
```

## Migration Notes

- Legacy session-based authentication routes are still available for backwards compatibility
- New routes should use JWT authentication
- The system supports both cookie and Bearer token authentication simultaneously
- Domain validation ensures only users from allowed domains can access the API
