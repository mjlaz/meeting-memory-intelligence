/**
 * Rate limiting middleware configuration
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './errorHandler.js';

/**
 * Rate limit store interface
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Maximum number of requests per window
   */
  max: number;

  /**
   * Message to send when rate limit is exceeded
   */
  message?: string;

  /**
   * Status code to send when rate limit is exceeded
   */
  statusCode?: number;

  /**
   * Skip rate limiting for certain requests
   */
  skip?: (req: Request) => boolean;

  /**
   * Key generator function
   */
  keyGenerator?: (req: Request) => string;

  /**
   * Handler for rate limit exceeded
   */
  handler?: (req: Request, res: Response) => void;

  /**
   * Headers to include in response
   */
  standardHeaders?: boolean;

  /**
   * Use legacy headers (X-RateLimit-*)
   */
  legacyHeaders?: boolean;
}

/**
 * In-memory rate limit store
 */
class MemoryStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Increment request count for a key
   */
  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      this.store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return this.store[key];
    }

    // Increment existing entry
    entry.count++;
    return entry;
  }

  /**
   * Get current count for a key
   */
  get(key: string): { count: number; resetTime: number } | undefined {
    const entry = this.store[key];
    if (!entry) return undefined;

    const now = Date.now();
    if (now > entry.resetTime) {
      delete this.store[key];
      return undefined;
    }

    return entry;
  }

  /**
   * Reset count for a key
   */
  reset(key: string): void {
    delete this.store[key];
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Object.entries(this.store)) {
      if (now > entry.resetTime) {
        delete this.store[key];
      }
    }
  }

  /**
   * Destroy the store and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store = {};
  }
}

/**
 * Default key generator (uses IP address)
 */
function defaultKeyGenerator(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    skip,
    keyGenerator = defaultKeyGenerator,
    handler,
    standardHeaders = true,
    legacyHeaders = false
  } = config;

  const store = new MemoryStore();

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if skip function returns true
    if (skip && skip(req)) {
      return next();
    }

    // Generate key for this request
    const key = keyGenerator(req);

    // Increment request count
    const { count, resetTime } = store.increment(key, windowMs);

    // Calculate remaining requests and reset time
    const remaining = Math.max(0, max - count);
    const resetTimeSeconds = Math.ceil((resetTime - Date.now()) / 1000);

    // Set rate limit headers
    if (standardHeaders) {
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', new Date(resetTime).toISOString());
    }

    if (legacyHeaders) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
    }

    // Check if rate limit exceeded
    if (count > max) {
      res.setHeader('Retry-After', resetTimeSeconds);

      if (handler) {
        return handler(req, res);
      }

      const error = new RateLimitError(message, resetTimeSeconds);
      return next(error);
    }

    next();
  };
}

/**
 * Predefined rate limiters for common use cases
 */

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later'
});

/**
 * Standard rate limiter for API endpoints
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

/**
 * Lenient rate limiter for read-only endpoints
 */
export const readRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window
  message: 'Too many requests, please try again later'
});

/**
 * Strict rate limiter for file upload endpoints
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Too many upload requests, please try again later'
});

/**
 * Rate limiter for expensive operations (AI/ML processing)
 */
export const expensiveOperationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  message: 'Too many processing requests, please try again later'
});

/**
 * Sliding window rate limiter (more accurate but more memory intensive)
 */
export function createSlidingWindowRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    skip,
    keyGenerator = defaultKeyGenerator
  } = config;

  // Store timestamps of requests
  const requestTimestamps: { [key: string]: number[] } = {};

  return (req: Request, res: Response, next: NextFunction) => {
    if (skip && skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Initialize or get existing timestamps
    if (!requestTimestamps[key]) {
      requestTimestamps[key] = [];
    }

    // Remove timestamps outside the window
    requestTimestamps[key] = requestTimestamps[key].filter(
      timestamp => timestamp > windowStart
    );

    // Add current timestamp
    requestTimestamps[key].push(now);

    const count = requestTimestamps[key].length;
    const remaining = Math.max(0, max - count);

    // Set headers
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', new Date(now + windowMs).toISOString());

    // Check if rate limit exceeded
    if (count > max) {
      const oldestTimestamp = requestTimestamps[key][0];
      const resetTimeSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
      res.setHeader('Retry-After', resetTimeSeconds);

      const error = new RateLimitError(message, resetTimeSeconds);
      return next(error);
    }

    next();
  };
}

/**
 * Create a rate limiter that varies by user/API key
 */
export function createUserBasedRateLimiter(config: RateLimitConfig & {
  getUserKey?: (req: Request) => string | null;
}) {
  const getUserKey = config.getUserKey || ((req: Request) => {
    // Try to get user ID from various sources
    return (req as any).user?.id || 
           (req as any).userId || 
           req.headers['x-api-key'] as string ||
           null;
  });

  return createRateLimiter({
    ...config,
    keyGenerator: (req: Request) => {
      const userKey = getUserKey(req);
      if (userKey) {
        return `user:${userKey}`;
      }
      // Fall back to IP-based rate limiting
      return `ip:${defaultKeyGenerator(req)}`;
    }
  });
}

// Made with Bob
