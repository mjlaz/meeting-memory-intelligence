/**
 * Tests for Rate Limiter Middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  createRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  readRateLimiter,
  uploadRateLimiter,
  expensiveOperationRateLimiter,
  createSlidingWindowRateLimiter,
  createUserBasedRateLimiter
} from '../../src/middleware/rateLimiter';
import { RateLimitError } from '../../src/middleware/errorHandler';

describe('Rate Limiter Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '127.0.0.1'
      } as any
    };

    mockResponse = {
      setHeader: jest.fn()
    };

    mockNext = jest.fn();

    // Reset time for consistent testing
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('createRateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5
      });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        limiter(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should block requests exceeding limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 3
      });

      // Make 4 requests (1 over limit)
      for (let i = 0; i < 4; i++) {
        limiter(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // First 3 should succeed
      expect(mockNext).toHaveBeenCalledWith();

      // 4th should fail
      const lastCall = (mockNext as jest.Mock).mock.calls[3][0];
      expect(lastCall).toBeInstanceOf(RateLimitError);
    });

    it('should set rate limit headers', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 10,
        standardHeaders: true
      });

      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Limit', 10);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 9);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Reset', expect.any(String));
    });

    it('should set legacy headers when enabled', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 10,
        legacyHeaders: true
      });

      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should set Retry-After header when limit exceeded', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1
      });

      // First request succeeds
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      // Second request fails
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });

    it('should reset count after window expires', () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 2
      });

      // Make 2 requests
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      // Advance time past window
      jest.advanceTimersByTime(1001);

      // Should allow new requests
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should use custom key generator', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        keyGenerator: (req) => req.headers?.['x-api-key'] as string || 'default'
      });

      mockRequest.headers = { 'x-api-key': 'user1' };

      // Make 2 requests with same key
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      // Change key
      mockRequest.headers = { 'x-api-key': 'user2' };

      // Should allow request with different key
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should skip rate limiting when skip function returns true', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        skip: (req) => req.headers?.['x-skip'] === 'true'
      });

      mockRequest.headers = { 'x-skip': 'true' };

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        limiter(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // All should succeed
      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should use custom handler when provided', () => {
      const customHandler = jest.fn();
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        handler: customHandler
      });

      // Make 2 requests
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(customHandler).toHaveBeenCalledTimes(1);
    });

    it('should use custom message', () => {
      const customMessage = 'Custom rate limit message';
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        message: customMessage
      });

      // Exceed limit
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      const error = (mockNext as jest.Mock).mock.calls[1][0];
      expect(error.message).toBe(customMessage);
    });
  });

  describe('Predefined Rate Limiters', () => {
    it('authRateLimiter should have strict limits', () => {
      // Auth limiter allows 5 requests per 15 minutes
      for (let i = 0; i < 5; i++) {
        authRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledWith();

      // 6th request should fail
      authRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      const error = (mockNext as jest.Mock).mock.calls[5][0];
      expect(error).toBeInstanceOf(RateLimitError);
    });

    it('apiRateLimiter should allow moderate traffic', () => {
      // API limiter allows 100 requests per 15 minutes
      for (let i = 0; i < 100; i++) {
        apiRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('readRateLimiter should be most lenient', () => {
      // Read limiter allows 300 requests per 15 minutes
      for (let i = 0; i < 300; i++) {
        readRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('uploadRateLimiter should limit uploads', () => {
      // Upload limiter allows 10 requests per hour
      for (let i = 0; i < 10; i++) {
        uploadRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledWith();

      // 11th should fail
      uploadRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      const error = (mockNext as jest.Mock).mock.calls[10][0];
      expect(error).toBeInstanceOf(RateLimitError);
    });

    it('expensiveOperationRateLimiter should limit expensive ops', () => {
      // Expensive operation limiter allows 20 requests per hour
      for (let i = 0; i < 20; i++) {
        expensiveOperationRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('createSlidingWindowRateLimiter', () => {
    it('should implement sliding window algorithm', () => {
      const limiter = createSlidingWindowRateLimiter({
        windowMs: 1000,
        max: 3
      });

      // Make 3 requests
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      // 4th should fail
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect((mockNext as jest.Mock).mock.calls[3][0]).toBeInstanceOf(RateLimitError);

      // Advance time by 500ms (half window)
      jest.advanceTimersByTime(500);

      // Still should fail (all 3 requests still in window)
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect((mockNext as jest.Mock).mock.calls[4][0]).toBeInstanceOf(RateLimitError);

      // Advance time past first request
      jest.advanceTimersByTime(501);

      // Should succeed now (first request expired)
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should remove expired timestamps', () => {
      const limiter = createSlidingWindowRateLimiter({
        windowMs: 1000,
        max: 2
      });

      // Make 2 requests
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      // Advance time past window
      jest.advanceTimersByTime(1001);

      // Should allow 2 new requests
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('createUserBasedRateLimiter', () => {
    it('should rate limit by user ID', () => {
      const limiter = createUserBasedRateLimiter({
        windowMs: 60000,
        max: 2
      });

      (mockRequest as any).user = { id: 'user1' };

      // Make 2 requests for user1
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      // 3rd should fail
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect((mockNext as jest.Mock).mock.calls[2][0]).toBeInstanceOf(RateLimitError);

      // Different user should have separate limit
      (mockRequest as any).user = { id: 'user2' };
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fall back to IP-based limiting without user', () => {
      const limiter = createUserBasedRateLimiter({
        windowMs: 60000,
        max: 2
      });

      // No user set, should use IP
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      // 3rd should fail
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect((mockNext as jest.Mock).mock.calls[2][0]).toBeInstanceOf(RateLimitError);
    });

    it('should use API key if available', () => {
      const limiter = createUserBasedRateLimiter({
        windowMs: 60000,
        max: 2
      });

      mockRequest.headers = { 'x-api-key': 'key123' };

      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      // 3rd should fail
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect((mockNext as jest.Mock).mock.calls[2][0]).toBeInstanceOf(RateLimitError);
    });

    it('should use custom getUserKey function', () => {
      const limiter = createUserBasedRateLimiter({
        windowMs: 60000,
        max: 2,
        getUserKey: (req) => (req as any).customId
      });

      (mockRequest as any).customId = 'custom123';

      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      // 3rd should fail
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect((mockNext as jest.Mock).mock.calls[2][0]).toBeInstanceOf(RateLimitError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP address', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5
      });

      mockRequest.ip = undefined;
      mockRequest.socket = undefined;

      expect(() => {
        limiter(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle concurrent requests', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5
      });

      // Simulate concurrent requests
      const promises = Array.from({ length: 10 }, () => {
        return new Promise<void>((resolve) => {
          limiter(mockRequest as Request, mockResponse as Response, mockNext);
          resolve();
        });
      });

      return Promise.all(promises).then(() => {
        // Some should succeed, some should fail
        const successCount = (mockNext as jest.Mock).mock.calls.filter(
          call => call.length === 0
        ).length;
        const errorCount = (mockNext as jest.Mock).mock.calls.filter(
          call => call[0] instanceof RateLimitError
        ).length;

        expect(successCount).toBe(5);
        expect(errorCount).toBe(5);
      });
    });

    it('should handle very short windows', () => {
      const limiter = createRateLimiter({
        windowMs: 10,
        max: 1
      });

      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      jest.advanceTimersByTime(11);

      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle very large limits', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 10000
      });

      for (let i = 0; i < 100; i++) {
        limiter(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Rate Limit Headers', () => {
    it('should update remaining count correctly', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
        standardHeaders: true
      });

      // First request
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 4);

      // Second request
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 3);
    });

    it('should show 0 remaining when limit reached', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        standardHeaders: true
      });

      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 0);
    });

    it('should format reset time as ISO string', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
        standardHeaders: true
      });

      limiter(mockRequest as Request, mockResponse as Response, mockNext);

      const resetCall = (mockResponse.setHeader as jest.Mock).mock.calls.find(
        call => call[0] === 'RateLimit-Reset'
      );

      expect(resetCall[1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

// Made with Bob
