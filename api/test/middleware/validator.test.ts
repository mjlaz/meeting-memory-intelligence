/**
 * Tests for Validator Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateMultiple,
  commonSchemas,
  createValidator,
  sanitizeString,
  sanitizeObject,
  sanitizeRequest
} from '../../src/middleware/validator';
import { ValidationError } from '../../src/middleware/errorHandler';

describe('Validator Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {}
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validate', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive()
    });

    it('should validate valid body data', async () => {
      mockRequest.body = { name: 'John', age: 30 };
      const middleware = validate(testSchema, 'body');

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: 'John', age: 30 });
    });

    it('should reject invalid body data', async () => {
      mockRequest.body = { name: '', age: -5 };
      const middleware = validate(testSchema, 'body');

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.errors).toBeDefined();
      expect(error.errors.length).toBeGreaterThan(0);
    });

    it('should validate query parameters', async () => {
      mockRequest.query = { name: 'John', age: '30' };
      const middleware = validate(testSchema, 'query');

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate route params', async () => {
      const idSchema = z.object({ id: z.string().uuid() });
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const middleware = validate(idSchema, 'params');

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should format validation errors correctly', async () => {
      mockRequest.body = { name: '', age: 'invalid' };
      const middleware = validate(testSchema, 'body');

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.errors[0]).toHaveProperty('field');
      expect(error.errors[0]).toHaveProperty('message');
      expect(error.errors[0]).toHaveProperty('code');
    });

    it('should handle async validation', async () => {
      const asyncSchema = z.object({
        email: z.string().email()
      });
      mockRequest.body = { email: 'test@example.com' };
      const middleware = validate(asyncSchema, 'body', { async: true });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateBody', () => {
    it('should validate request body', async () => {
      const schema = z.object({ username: z.string() });
      mockRequest.body = { username: 'testuser' };
      const middleware = validateBody(schema);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid body', async () => {
      const schema = z.object({ username: z.string().min(3) });
      mockRequest.body = { username: 'ab' };
      const middleware = validateBody(schema);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters', async () => {
      const schema = z.object({ page: z.coerce.number() });
      mockRequest.query = { page: '1' };
      const middleware = validateQuery(schema);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({ page: 1 });
    });

    it('should coerce string to number', async () => {
      const schema = z.object({ limit: z.coerce.number() });
      mockRequest.query = { limit: '10' };
      const middleware = validateQuery(schema);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.query.limit).toBe(10);
    });
  });

  describe('validateParams', () => {
    it('should validate route parameters', async () => {
      const schema = z.object({ id: z.coerce.number().positive() });
      mockRequest.params = { id: '123' };
      const middleware = validateParams(schema);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.params.id).toBe(123);
    });

    it('should reject invalid params', async () => {
      const schema = z.object({ id: z.coerce.number().positive() });
      mockRequest.params = { id: '-1' };
      const middleware = validateParams(schema);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateMultiple', () => {
    it('should validate multiple targets', async () => {
      const schemas = {
        body: z.object({ name: z.string() }),
        query: z.object({ page: z.coerce.number() }),
        params: z.object({ id: z.coerce.number() })
      };

      mockRequest.body = { name: 'test' };
      mockRequest.query = { page: '1' };
      mockRequest.params = { id: '123' };

      const middleware = validateMultiple(schemas);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should collect errors from all targets', async () => {
      const schemas = {
        body: z.object({ name: z.string().min(3) }),
        query: z.object({ page: z.coerce.number().positive() })
      };

      mockRequest.body = { name: 'ab' };
      mockRequest.query = { page: '-1' };

      const middleware = validateMultiple(schemas);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should indicate which target failed', async () => {
      const schemas = {
        body: z.object({ name: z.string() }),
        query: z.object({ page: z.coerce.number() })
      };

      mockRequest.body = { name: 123 };
      mockRequest.query = { page: 'invalid' };

      const middleware = validateMultiple(schemas);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.errors.some((e: any) => e.target === 'body')).toBe(true);
      expect(error.errors.some((e: any) => e.target === 'query')).toBe(true);
    });
  });

  describe('commonSchemas', () => {
    describe('pagination', () => {
      it('should validate pagination parameters', async () => {
        mockRequest.query = { limit: '50', offset: '10' };
        const middleware = validateQuery(commonSchemas.pagination);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRequest.query.limit).toBe(50);
        expect(mockRequest.query.offset).toBe(10);
      });

      it('should use default values', async () => {
        mockRequest.query = {};
        const middleware = validateQuery(commonSchemas.pagination);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.query.limit).toBe(100);
        expect(mockRequest.query.offset).toBe(0);
      });

      it('should enforce maximum limit', async () => {
        mockRequest.query = { limit: '2000' };
        const middleware = validateQuery(commonSchemas.pagination);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      });
    });

    describe('id', () => {
      it('should validate numeric ID', async () => {
        mockRequest.params = { id: '123' };
        const middleware = validateParams(commonSchemas.id);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRequest.params.id).toBe(123);
      });

      it('should reject negative IDs', async () => {
        mockRequest.params = { id: '-1' };
        const middleware = validateParams(commonSchemas.id);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      });
    });

    describe('uuid', () => {
      it('should validate UUID format', async () => {
        mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
        const middleware = validateParams(commonSchemas.uuid);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should reject invalid UUID', async () => {
        mockRequest.params = { id: 'not-a-uuid' };
        const middleware = validateParams(commonSchemas.uuid);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      });
    });

    describe('dateRange', () => {
      it('should validate date range', async () => {
        mockRequest.query = {
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-12-31T23:59:59Z'
        };
        const middleware = validateQuery(commonSchemas.dateRange);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow optional dates', async () => {
        mockRequest.query = {};
        const middleware = validateQuery(commonSchemas.dateRange);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('search', () => {
      it('should validate search query', async () => {
        mockRequest.query = { q: 'test search' };
        const middleware = validateQuery(commonSchemas.search);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should enforce minimum length', async () => {
        mockRequest.query = { q: '' };
        const middleware = validateQuery(commonSchemas.search);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      });

      it('should enforce maximum length', async () => {
        mockRequest.query = { q: 'a'.repeat(201) };
        const middleware = validateQuery(commonSchemas.search);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      });
    });

    describe('sort', () => {
      it('should validate sort parameters', async () => {
        mockRequest.query = { sort_by: 'name', sort_order: 'desc' };
        const middleware = validateQuery(commonSchemas.sort);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should use default sort order', async () => {
        mockRequest.query = { sort_by: 'name' };
        const middleware = validateQuery(commonSchemas.sort);

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.query.sort_order).toBe('asc');
      });
    });
  });

  describe('createValidator', () => {
    it('should create custom validator', async () => {
      const customValidation = (data: any) => {
        if (data.password !== data.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        return data;
      };

      mockRequest.body = { password: 'test123', confirmPassword: 'test123' };
      const middleware = createValidator(customValidation, 'body');

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle validation errors', async () => {
      const customValidation = (data: any) => {
        throw new Error('Custom validation failed');
      };

      mockRequest.body = { test: 'data' };
      const middleware = createValidator(customValidation, 'body');

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should support async validation', async () => {
      const asyncValidation = async (data: any) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return data;
      };

      mockRequest.body = { test: 'data' };
      const middleware = createValidator(asyncValidation, 'body');

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('Hello');
    });

    it('should trim whitespace', () => {
      const input = '  test  ';
      const result = sanitizeString(input);

      expect(result).toBe('test');
    });

    it('should handle empty strings', () => {
      const result = sanitizeString('');

      expect(result).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string values', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        age: 30
      };

      const result = sanitizeObject(input);

      expect(result.name).not.toContain('<script>');
      expect(result.age).toBe(30);
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          profile: {
            bio: '<script>xss</script>'
          }
        }
      };

      const result = sanitizeObject(input);

      expect(result.user.name).not.toContain('<b>');
      expect(result.user.profile.bio).not.toContain('<script>');
    });

    it('should sanitize arrays', () => {
      const input = {
        tags: ['<script>tag1</script>', 'tag2', '<b>tag3</b>']
      };

      const result = sanitizeObject(input);

      expect(result.tags[0]).not.toContain('<script>');
      expect(result.tags[2]).not.toContain('<b>');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBeNull();
      expect(sanitizeObject(undefined)).toBeUndefined();
    });

    it('should preserve non-string types', () => {
      const input = {
        number: 123,
        boolean: true,
        date: new Date('2024-01-01')
      };

      const result = sanitizeObject(input);

      expect(result.number).toBe(123);
      expect(result.boolean).toBe(true);
      expect(result.date).toEqual(input.date);
    });
  });

  describe('sanitizeRequest', () => {
    it('should sanitize all request targets by default', () => {
      mockRequest.body = { name: '<script>xss</script>' };
      mockRequest.query = { search: '<b>test</b>' };
      mockRequest.params = { id: '<i>123</i>' };

      const middleware = sanitizeRequest();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.name).not.toContain('<script>');
      expect(mockRequest.query.search).not.toContain('<b>');
      expect(mockRequest.params.id).not.toContain('<i>');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should sanitize specific targets', () => {
      mockRequest.body = { name: '<script>xss</script>' };
      mockRequest.query = { search: '<b>test</b>' };

      const middleware = sanitizeRequest(['body']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.name).not.toContain('<script>');
      expect(mockRequest.query.search).toContain('<b>'); // Not sanitized
    });

    it('should handle missing request properties', () => {
      mockRequest.body = undefined;
      mockRequest.query = undefined;

      const middleware = sanitizeRequest();

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large objects', async () => {
      const largeObject: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`field${i}`] = `value${i}`;
      }

      mockRequest.body = largeObject;
      const schema = z.object({}).passthrough();
      const middleware = validate(schema, 'body');

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle circular references in sanitization', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => {
        sanitizeObject(circular);
      }).not.toThrow();
    });

    it('should handle special characters', () => {
      const input = 'Test™ © ® € £ ¥';
      const result = sanitizeString(input);

      expect(result).toContain('™');
      expect(result).toContain('©');
    });

    it('should handle unicode characters', () => {
      const input = { name: '你好世界 🌍' };
      const result = sanitizeObject(input);

      expect(result.name).toContain('你好世界');
      expect(result.name).toContain('🌍');
    });
  });
});

// Made with Bob
