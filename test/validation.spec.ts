// Unit tests for validation middleware

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { Hono } from 'hono';
import { validateBody, validateQuery, validateParams } from '../src/middleware/validation';

describe('Validation Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
  });

  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0).optional()
    });

    it('should pass validation with valid data', async () => {
      app.post('/test', validateBody(testSchema), (c) => {
        const data = c.get('validatedBody');
        return c.json({ success: true, data });
      });

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      const response = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validData)
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(validData);
    });

    it('should fail validation with invalid data', async () => {
      app.post('/test', validateBody(testSchema), (c) => {
        return c.json({ success: true });
      });

      const invalidData = {
        name: '',  // Empty name should fail
        email: 'invalid-email',  // Invalid email format
        age: -1  // Negative age should fail
      };

      const response = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Validation Error');
      expect(body.error.errors).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      app.post('/test', validateBody(testSchema), (c) => {
        return c.json({ success: true });
      });

      const response = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {'
      });

      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Bad Request');
    });
  });

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.string().transform(Number).optional(),
      limit: z.string().transform(Number).optional(),
      search: z.string().optional()
    });

    it('should pass validation with valid query parameters', async () => {
      app.get('/test', validateQuery(querySchema), (c) => {
        const query = c.get('validatedQuery');
        return c.json({ success: true, query });
      });

      const response = await app.request('/test?page=1&limit=10&search=test');

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.query).toEqual({
        page: 1,
        limit: 10,
        search: 'test'
      });
    });

    it('should fail validation with invalid query parameters', async () => {
      const testApp = new Hono();
      testApp.get('/test', validateQuery(querySchema), (c) => {
        return c.json({ success: true });
      });

      const response = await testApp.request('/test?page=invalid');

      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Query Parameter Validation Error');
    });
  });

  describe('validateParams', () => {
    const paramsSchema = z.object({
      id: z.string().regex(/^[a-z0-9]{25}$/, 'Invalid ID format'),
      type: z.enum(['user', 'admin']).optional()
    });

    it('should pass validation with valid path parameters', async () => {
      app.get('/test/:id/:type?', validateParams(paramsSchema), (c) => {
        const params = c.get('validatedParams');
        return c.json({ success: true, params });
      });

      const validId = 'cmcz7s2aw0000350dur6nkmg0';
      const response = await app.request(`/test/${validId}/user`);

      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.params).toEqual({
        id: validId,
        type: 'user'
      });
    });

    it('should fail validation with invalid path parameters', async () => {
      app.get('/test/:id', validateParams(paramsSchema), (c) => {
        return c.json({ success: true });
      });

      const response = await app.request('/test/invalid-id');

      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.title).toBe('Path Parameter Validation Error');
    });
  });
});
