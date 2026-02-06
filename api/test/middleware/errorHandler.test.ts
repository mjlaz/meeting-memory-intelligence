/**
 * Tests for Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  BadRequestError,
  errorHandler,
  notFoundHandler,
  asyncHandler
} from '../../src/middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'user-agent') return 'test-agent';
        return undefined;
      })
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Suppress console output during tests
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Custom Error Classes', () => {
    describe('AppError', () => {
      it('should create error with correct properties', () => {
        const error = new AppError('Test error', 400, true, 'TEST_ERROR');

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
        expect(error.code).toBe('TEST_ERROR');
        expect(error.stack).toBeDefined();
      });

      it('should use default values', () => {
        const error = new AppError('Test error');

        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
        expect(error.code).toBeUndefined();
      });
    });

    describe('ValidationError', () => {
      it('should create validation error with errors array', () => {
        const errors = [
          { field: 'email', message: 'Invalid email' },
          { field: 'password', message: 'Too short' }
        ];
        const error = new ValidationError('Validation failed', errors);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.errors).toEqual(errors);
      });

      it('should use default message', () => {
        const error = new ValidationError();

        expect(error.message).toBe('Validation failed');
      });
    });

    describe('UnauthorizedError', () => {
      it('should create 401 error', () => {
        const error = new UnauthorizedError('Not logged in');

        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
        expect(error.message).toBe('Not logged in');
      });
    });

    describe('ForbiddenError', () => {
      it('should create 403 error', () => {
        const error = new ForbiddenError('No permission');

        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('FORBIDDEN');
      });
    });

    describe('NotFoundError', () => {
      it('should create 404 error', () => {
        const error = new NotFoundError('User not found');

        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('ConflictError', () => {
      it('should create 409 error', () => {
        const error = new ConflictError('Email already exists');

        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('CONFLICT');
      });
    });

    describe('RateLimitError', () => {
      it('should create 429 error with retry-after', () => {
        const error = new RateLimitError('Too many requests', 60);

        expect(error.statusCode).toBe(429);
        expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(error.retryAfter).toBe(60);
      });
    });

    describe('InternalServerError', () => {
      it('should create 500 error', () => {
        const error = new InternalServerError('Server crashed');

        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });

    describe('ServiceUnavailableError', () => {
      it('should create 503 error', () => {
        const error = new ServiceUnavailableError('Database down');

        expect(error.statusCode).toBe(503);
        expect(error.code).toBe('SERVICE_UNAVAILABLE');
      });
    });

    describe('BadRequestError', () => {
      it('should create 400 error', () => {
        const error = new BadRequestError('Invalid input');

        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('BAD_REQUEST');
      });
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new ValidationError('Invalid data', [
        { field: 'name', message: 'Required' }
      ]);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid data',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            errors: [{ field: 'name', message: 'Required' }]
          })
        })
      );
    });

    it('should convert unknown errors to InternalServerError', () => {
      const error = new Error('Unknown error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            statusCode: 500,
            code: 'INTERNAL_SERVER_ERROR'
          })
        })
      );
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new AppError('Test error', 500);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String)
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should exclude stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new AppError('Test error', 500);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should set Retry-After header for rate limit errors', () => {
      const error = new RateLimitError('Too many requests', 120);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '120');
    });

    it('should include request context in error response', () => {
      const error = new NotFoundError('Resource not found');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            path: '/test',
            method: 'GET',
            timestamp: expect.any(String)
          })
        })
      );
    });

    it('should mask sensitive error messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Database connection string: postgres://user:pass@host');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error.message).not.toContain('postgres://user:pass@host');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('notFoundHandler', () => {
    it('should create NotFoundError and pass to next', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: expect.stringContaining('GET /test')
        })
      );
    });

    it('should include method and URL in error message', () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/users';

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('POST /api/users')
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward async errors', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle thrown errors in async functions', async () => {
      const asyncFn = jest.fn().mockImplementation(async () => {
        throw new ValidationError('Invalid input');
      });
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'VALIDATION_ERROR'
        })
      );
    });

    it('should preserve error properties', async () => {
      const customError = new RateLimitError('Rate limit', 60);
      const asyncFn = jest.fn().mockRejectedValue(customError);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          retryAfter: 60
        })
      );
    });
  });

  describe('Error Response Format', () => {
    it('should have consistent error response structure', () => {
      const error = new BadRequestError('Invalid request');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];

      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('message');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('statusCode');
      expect(response.error).toHaveProperty('timestamp');
      expect(response.error).toHaveProperty('path');
      expect(response.error).toHaveProperty('method');
    });

    it('should format timestamp in ISO format', () => {
      const error = new AppError('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Error Logging', () => {
    it('should log server errors (5xx)', () => {
      const error = new InternalServerError('Server error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(console.error).toHaveBeenCalled();
    });

    it('should log client errors (4xx) as warnings', () => {
      const error = new BadRequestError('Client error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(console.warn).toHaveBeenCalled();
    });

    it('should not log successful responses', () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const handler = asyncHandler(asyncFn);

      handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors without message', () => {
      const error = new AppError('', 500);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle errors with circular references', () => {
      const error: any = new AppError('Test error');
      error.circular = error; // Create circular reference

      expect(() => {
        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle missing request properties', () => {
      const minimalRequest = {} as Request;
      const error = new AppError('Test error');

      expect(() => {
        errorHandler(error, minimalRequest, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle null/undefined errors', () => {
      const error = null as any;

      expect(() => {
        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });
  });

  describe('instanceof checks', () => {
    it('should correctly identify error types', () => {
      const validationError = new ValidationError();
      const notFoundError = new NotFoundError();
      const appError = new AppError('test');

      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError instanceof AppError).toBe(true);
      expect(validationError instanceof Error).toBe(true);

      expect(notFoundError instanceof NotFoundError).toBe(true);
      expect(notFoundError instanceof AppError).toBe(true);

      expect(appError instanceof AppError).toBe(true);
      expect(appError instanceof Error).toBe(true);
    });

    it('should distinguish between error types', () => {
      const validationError = new ValidationError();
      const notFoundError = new NotFoundError();

      expect(validationError instanceof NotFoundError).toBe(false);
      expect(notFoundError instanceof ValidationError).toBe(false);
    });
  });
});

// Made with Bob
