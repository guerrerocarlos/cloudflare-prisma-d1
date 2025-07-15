/**
 * CloudFlare Pages Function to verify RPotential Auth JWT Cookie
 * Place this file in your CloudFlare Pages project at: functions/_middleware.js
 * Or use the verifyAuth function in your onRequest handler
 */

/**
 * Middleware to verify authentication for all requests
 */
export async function onRequest(context) {
  const { request, next, env } = context;

  // Skip auth for public paths (customize as needed)
  // const publicPaths = ['/assets', '/logout', '/img'];
  // const url = new URL(request.url);

  // if (publicPaths.some(path => url.pathname.length === 1 || url.pathname.startsWith(path))) {
  //   return next();
  // }

  const authResult = await verifyAuth(request, env);

  if (!authResult.isValid) {
    // Redirect to auth service
    const redirectUrl = `https://auth.rpotential.dev/auth?redirect_uri=${encodeURIComponent(request.url)}`;
    return Response.redirect(redirectUrl, 302);
  }

  // Add user info to request headers for downstream use
  const response = await next();
  // response.headers.set('X-User-Email', authResult.user.email);
  // response.headers.set('X-User-Name', authResult.user.name);
  // response.headers.set('X-User-Domain', authResult.user.domain);

  return response;
}

/**
 * Verify JWT authentication cookie
 */
export async function verifyAuth(request, env) {
  try {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) {
      return { isValid: false, error: 'No cookies found' };
    }

    // Extract rpotential_auth cookie
    const cookies = parseCookies(cookieHeader);
    const authToken = cookies.rpotential_auth;

    if (!authToken) {
      return { isValid: false, error: 'No auth token found' };
    }

    // Verify JWT
    const jwtSecret = env.JWT_SECRET || 'your-jwt-secret-key';
    const payload = await verifyJWT(authToken, jwtSecret);

    if (!payload) {
      return { isValid: false, error: 'Invalid token' };
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { isValid: false, error: 'Token expired' };
    }

    // Verify domain (optional additional check)
    const allowedDomains = ['rpotential.ai', 'globant.com'];
    if (!allowedDomains.includes(payload.domain)) {
      return { isValid: false, error: 'Domain not allowed' };
    }

    return {
      isValid: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        domain: payload.domain
      },
      token: payload
    };

  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

/**
 * Parse cookies from header string
 */
function parseCookies(cookieHeader) {
  const cookies = {};
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
async function verifyJWT(token, secret) {
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
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    return payload;

  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Sign data with HMAC-SHA256
 */
async function sign(data, secret) {
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
function base64UrlEncode(data) {
  if (typeof data === 'string') {
    data = new TextEncoder().encode(data);
  }

  let base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str) {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4);
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // Decode
  return atob(str);
}
