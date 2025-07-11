// Validation middleware for API endpoints

import { Context, Next } from 'hono';
import { ZodSchema, ZodError } from 'zod';
import { createErrorResponse, getCorrelationId } from '../utils/response';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validatedData = schema.parse(body);
      c.set('validatedBody', validatedData);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.issues.forEach((issue) => {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        });

        return createErrorResponse({
          status: 400,
          title: 'Validation Error',
          detail: 'The request body contains invalid data',
          errors
        }, getCorrelationId(c.req.raw));
      }

      return createErrorResponse({
        status: 400,
        title: 'Bad Request',
        detail: 'Invalid request body format'
      }, getCorrelationId(c.req.raw));
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const query = Object.fromEntries(
        new URL(c.req.url).searchParams.entries()
      );
      const validatedQuery = schema.parse(query);
      c.set('validatedQuery', validatedQuery);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.issues.forEach((issue) => {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        });

        return createErrorResponse({
          status: 400,
          title: 'Query Parameter Validation Error',
          detail: 'The query parameters contain invalid data',
          errors
        }, getCorrelationId(c.req.raw));
      }

      return createErrorResponse({
        status: 400,
        title: 'Bad Request',
        detail: 'Invalid query parameters'
      }, getCorrelationId(c.req.raw));
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const params = c.req.param();
      const validatedParams = schema.parse(params);
      c.set('validatedParams', validatedParams);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.issues.forEach((issue) => {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        });

        return createErrorResponse({
          status: 400,
          title: 'Path Parameter Validation Error',
          detail: 'The path parameters contain invalid data',
          errors
        }, getCorrelationId(c.req.raw));
      }

      return createErrorResponse({
        status: 400,
        title: 'Bad Request',
        detail: 'Invalid path parameters'
      }, getCorrelationId(c.req.raw));
    }
  };
}

// Common parameter schema
export const idParamSchema = {
  id: /^[a-z0-9]{25}$/
};
