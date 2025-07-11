// Response utility functions for consistent API responses

import type { ApiResponse, ApiError, ResponseMetadata, PaginatedResponse } from '../types/api';

// Generate correlation ID for tracing
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

// Create success response
export function createSuccessResponse<T>(
  data?: T,
  metadata?: Partial<ResponseMetadata>
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      correlation_id: metadata?.correlation_id || generateCorrelationId(),
      version: '1.0',
      ...metadata
    }
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': response.metadata!.correlation_id
    }
  });
}

// Create paginated response
export function createPaginatedResponse<T>(
  items: T[],
  pagination: {
    continuationToken?: string;
    totalItems?: number;
    hasMore: boolean;
    pageSize: number;
  },
  metadata?: Partial<ResponseMetadata>
): Response {
  const response: ApiResponse<PaginatedResponse<T>> = {
    success: true,
    data: {
      items,
      ...pagination
    },
    metadata: {
      timestamp: new Date().toISOString(),
      correlation_id: metadata?.correlation_id || generateCorrelationId(),
      version: '1.0',
      ...metadata
    }
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': response.metadata!.correlation_id
    }
  });
}

// Create error response
export function createErrorResponse(
  error: Partial<ApiError> & { status: number; title: string; detail: string },
  correlationId?: string
): Response {
  const apiError: ApiError = {
    type: error.type || `https://api.rpotential.dev/problems/${error.title.toLowerCase().replace(/\s+/g, '-')}`,
    title: error.title,
    status: error.status,
    detail: error.detail,
    instance: error.instance,
    errors: error.errors,
    timestamp: new Date().toISOString(),
    trace_id: correlationId || generateCorrelationId()
  };

  const response: ApiResponse = {
    success: false,
    error: apiError
  };

  return new Response(JSON.stringify(response), {
    status: error.status,
    headers: {
      'Content-Type': 'application/problem+json',
      'X-Correlation-ID': apiError.trace_id!
    }
  });
}

// Common error responses
export function createValidationErrorResponse(
  errors: Record<string, string[]>,
  correlationId?: string
): Response {
  return createErrorResponse(
    {
      status: 400,
      title: 'Validation Error',
      detail: 'The request contains invalid parameters',
      errors
    },
    correlationId
  );
}

export function createNotFoundResponse(
  resource: string,
  correlationId?: string
): Response {
  return createErrorResponse(
    {
      status: 404,
      title: 'Resource Not Found',
      detail: `The requested ${resource} was not found`
    },
    correlationId
  );
}

export function createUnauthorizedResponse(correlationId?: string): Response {
  return createErrorResponse(
    {
      status: 401,
      title: 'Authentication Required',
      detail: 'Valid authentication credentials are required'
    },
    correlationId
  );
}

export function createForbiddenResponse(correlationId?: string): Response {
  return createErrorResponse(
    {
      status: 403,
      title: 'Insufficient Permissions',
      detail: 'You do not have permission to access this resource'
    },
    correlationId
  );
}

export function createConflictResponse(
  detail: string,
  correlationId?: string
): Response {
  return createErrorResponse(
    {
      status: 409,
      title: 'Resource Conflict',
      detail
    },
    correlationId
  );
}

export function createRateLimitResponse(correlationId?: string): Response {
  return createErrorResponse(
    {
      status: 429,
      title: 'Rate Limit Exceeded',
      detail: 'Too many requests. Please try again later'
    },
    correlationId
  );
}

export function createInternalServerErrorResponse(
  detail?: string,
  correlationId?: string
): Response {
  return createErrorResponse(
    {
      status: 500,
      title: 'Internal Server Error',
      detail: detail || 'An unexpected error occurred'
    },
    correlationId
  );
}

// Stream response for Server-Sent Events
export function createStreamResponse(correlationId?: string): Response {
  const stream = new TransformStream();
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Correlation-ID': correlationId || generateCorrelationId()
    }
  });
}

// Send Server-Sent Event
export function sendServerSentEvent(
  writer: WritableStreamDefaultWriter,
  event: {
    type: string;
    data: any;
    id?: string;
    retry?: number;
  }
): Promise<void> {
  const lines = [
    `event: ${event.type}`,
    `data: ${JSON.stringify(event.data)}`
  ];

  if (event.id) {
    lines.unshift(`id: ${event.id}`);
  }

  if (event.retry) {
    lines.push(`retry: ${event.retry}`);
  }

  lines.push('', ''); // Add empty lines to separate events

  const eventString = lines.join('\n');
  const encoder = new TextEncoder();
  
  return writer.write(encoder.encode(eventString));
}

// Helper to extract correlation ID from request headers
export function getCorrelationId(request: Request): string {
  return request.headers.get('X-Correlation-ID') || 
         request.headers.get('X-Trace-ID') || 
         generateCorrelationId();
}

// Helper to parse JSON body safely
export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    const contentType = request.headers.get('Content-Type');
    if (!contentType?.includes('application/json')) {
      return null;
    }

    const text = await request.text();
    if (!text.trim()) {
      return null;
    }

    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// Helper to extract query parameters
export function getQueryParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

// Helper to extract path parameters
export function getPathParams(
  url: URL,
  pattern: string
): Record<string, string> {
  const params: Record<string, string> = {};
  const urlParts = url.pathname.split('/');
  const patternParts = pattern.split('/');

  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith(':')) {
      const key = part.slice(1);
      const value = urlParts[i];
      if (value) {
        params[key] = decodeURIComponent(value);
      }
    }
  }

  return params;
}

// Helper to validate and parse pagination parameters
export function parsePaginationParams(queryParams: Record<string, string>) {
  return {
    cursor: queryParams.cursor || undefined,
    limit: Math.min(parseInt(queryParams.limit || '25'), 100),
    orderBy: queryParams.orderBy || 'createdAt',
    orderDirection: (queryParams.orderDirection === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
  };
}
