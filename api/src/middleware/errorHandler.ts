/**
 * Error handling middleware with custom error classes
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  public readonly errors?: any[];

  constructor(message: string = 'Validation failed', errors?: any[]) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, true, 'UNAUTHORIZED');
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, true, 'FORBIDDEN');
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true, 'CONFLICT');
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Internal server error (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, true, 'INTERNAL_SERVER_ERROR');
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, true, 'SERVICE_UNAVAILABLE');
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, true, 'BAD_REQUEST');
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    errors?: any[];
    stack?: string;
    timestamp: string;
    path?: string;
    method?: string;
  };
}

/**
 * Format error response
 */
function formatErrorResponse(
  err: AppError,
  req: Request,
  includeStack: boolean = false
): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    }
  };

  // Add validation errors if present
  if (err instanceof ValidationError && err.errors) {
    response.error.errors = err.errors;
  }

  // Include stack trace only in development
  if (includeStack && err.stack) {
    response.error.stack = err.stack;
  }

  return response;
}

/**
 * Determine if error is operational
 */
function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Global error handler middleware
 * Must be registered after all routes
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default to 500 if not an AppError
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else {
    // Convert unknown errors to InternalServerError
    appError = new InternalServerError(
      process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message
    );
    appError.stack = err.stack;
  }

  // Log error with context
  const logContext = {
    statusCode: appError.statusCode,
    code: appError.code,
    path: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: (req as any).id // If request ID middleware is used
  };

  if (appError.statusCode >= 500) {
    logger.error('Server error occurred', err, logContext);
  } else if (appError.statusCode >= 400) {
    logger.warn('Client error occurred', logContext);
  }

  // Send error response
  const includeStack = process.env.NODE_ENV !== 'production';
  const errorResponse = formatErrorResponse(appError, req, includeStack);

  // Add retry-after header for rate limit errors
  if (appError instanceof RateLimitError && appError.retryAfter) {
    res.setHeader('Retry-After', String(appError.retryAfter));
  }

  res.status(appError.statusCode).json(errorResponse);
}

/**
 * Handle 404 errors for undefined routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError(`Route ${req.method} ${req.url} not found`);
  next(error);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtException(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error, {
      type: 'uncaughtException',
      fatal: true
    });

    // Give time for logs to be written
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejection(): void {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
      type: 'unhandledRejection',
      promise: String(promise)
    });

    // In production, we might want to exit
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });
}

// Made with Bob
