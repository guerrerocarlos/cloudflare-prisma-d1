// Unit tests for API middleware and utilities

import { describe, it, expect } from 'vitest';
import { createSuccessResponse, createErrorResponse, getCorrelationId } from '../src/utils/response';
import { createPaginatedResponse } from '../src/utils/response';

describe('Response Utils', () => {
  describe('createSuccessResponse', () => {
    it('should create a success response with data', async () => {
      const data = { id: 1, name: 'Test' };
      const response = createSuccessResponse(data);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Correlation-ID')).toBeTruthy();
      
      const body = await response.json();
      expect(body).toMatchObject({
        success: true,
        data: data,
        metadata: {
          timestamp: expect.any(String),
          correlation_id: expect.any(String),
          version: '1.0'
        }
      });
    });

    it('should include custom metadata', async () => {
      const data = { id: 1 };
      const metadata = { correlation_id: 'test-id' };
      const response = createSuccessResponse(data, metadata);
      
      const body = await response.json() as any;
      expect(body.metadata).toMatchObject({
        correlation_id: 'test-id',
        timestamp: expect.any(String),
        version: '1.0'
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create RFC 7807 compliant error response', async () => {
      const error = {
        status: 400,
        title: 'Bad Request',
        detail: 'Invalid input'
      };
      const correlationId = 'test-correlation-id';
      
      const response = createErrorResponse(error, correlationId);
      
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');
      expect(response.headers.get('X-Correlation-ID')).toBe(correlationId);
      
      const body = await response.json();
      expect(body).toMatchObject({
        success: false,
        error: {
          type: 'https://api.rpotential.dev/problems/bad-request',
          title: 'Bad Request',
          status: 400,
          detail: 'Invalid input',
          timestamp: expect.any(String),
          trace_id: correlationId
        }
      });
    });

    it('should include validation errors', async () => {
      const error = {
        status: 400,
        title: 'Validation Error',
        detail: 'Invalid fields',
        errors: { email: ['Required field'] }
      };
      
      const response = createErrorResponse(error, 'test-id');
      const body = await response.json();
      
      expect(body.error.errors).toEqual({
        email: ['Required field']
      });
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const pagination = {
        totalItems: 10,
        pageSize: 2,
        hasMore: true
      };
      
      const response = createPaginatedResponse(items, pagination);
      const body = await response.json();
      
      expect(body).toMatchObject({
        success: true,
        data: {
          items: items,
          totalItems: 10,
          pageSize: 2,
          hasMore: true
        }
      });
    });

    it('should handle cursor-based pagination', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const pagination = {
        pageSize: 25,
        hasMore: false
      };
      
      const response = createPaginatedResponse(items, pagination);
      const body = await response.json();
      
      expect(body.data).toMatchObject({
        items: items,
        hasMore: false,
        pageSize: 25
      });
    });
  });

  describe('getCorrelationId', () => {
    it('should extract correlation ID from request headers', () => {
      const mockRequest = new Request('http://localhost', {
        headers: {
          'X-Correlation-ID': 'test-correlation-id'
        }
      });
      
      const correlationId = getCorrelationId(mockRequest);
      expect(correlationId).toBe('test-correlation-id');
    });

    it('should generate correlation ID if not provided', () => {
      const mockRequest = new Request('http://localhost');
      
      const correlationId = getCorrelationId(mockRequest);
      expect(correlationId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });
  });
});
