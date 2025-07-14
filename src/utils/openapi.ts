import { z } from 'zod';

/**
 * OpenAPI utility functions for Zod schema integration
 */

/**
 * Safely adds OpenAPI metadata to Zod schemas
 * This is a wrapper to handle cases where the .openapi() method might not be available
 */
export function safeOpenApi<T extends z.ZodTypeAny>(
  schema: T,
  openApiConfig: {
    description?: string;
    example?: any;
    examples?: any[];
    format?: string;
    title?: string;
    deprecated?: boolean;
  }
): T {
  // Check if the schema has the openapi method (from @hono/zod-openapi)
  if (typeof (schema as any).openapi === 'function') {
    return (schema as any).openapi(openApiConfig);
  }
  
  // Fallback: return the original schema if openapi method is not available
  return schema;
}