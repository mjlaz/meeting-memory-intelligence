/**
 * Request validation middleware using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError } from './errorHandler.js';

/**
 * Validation target type
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation options
 */
interface ValidationOptions {
  /**
   * Strip unknown keys from the validated data
   */
  stripUnknown?: boolean;
  
  /**
   * Allow async validation
   */
  async?: boolean;
}

/**
 * Format Zod validation errors into a more readable format
 */
function formatZodErrors(error: ZodError): any[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
}

/**
 * Create a validation middleware for a specific target
 */
export function validate(
  schema: ZodSchema,
  target: ValidationTarget = 'body',
  options: ValidationOptions = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the data to validate based on target
      const dataToValidate = req[target];

      // Perform validation
      if (options.async) {
        // Async validation
        const validated = await schema.parseAsync(dataToValidate);
        req[target] = validated;
      } else {
        // Sync validation
        const validated = schema.parse(dataToValidate);
        req[target] = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        const validationError = new ValidationError(
          `Validation failed for ${target}`,
          formattedErrors
        );
        next(validationError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request body
 */
export function validateBody(schema: ZodSchema, options?: ValidationOptions) {
  return validate(schema, 'body', options);
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema, options?: ValidationOptions) {
  return validate(schema, 'query', options);
}

/**
 * Validate route parameters
 */
export function validateParams(schema: ZodSchema, options?: ValidationOptions) {
  return validate(schema, 'params', options);
}

/**
 * Validate multiple targets at once
 */
export function validateMultiple(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}, options?: ValidationOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: any[] = [];

      // Validate body
      if (schemas.body) {
        try {
          if (options?.async) {
            req.body = await schemas.body.parseAsync(req.body);
          } else {
            req.body = schemas.body.parse(req.body);
          }
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodErrors(error).map(e => ({ ...e, target: 'body' })));
          }
        }
      }

      // Validate query
      if (schemas.query) {
        try {
          if (options?.async) {
            req.query = await schemas.query.parseAsync(req.query);
          } else {
            req.query = schemas.query.parse(req.query);
          }
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodErrors(error).map(e => ({ ...e, target: 'query' })));
          }
        }
      }

      // Validate params
      if (schemas.params) {
        try {
          if (options?.async) {
            req.params = await schemas.params.parseAsync(req.params);
          } else {
            req.params = schemas.params.parse(req.params);
          }
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodErrors(error).map(e => ({ ...e, target: 'params' })));
          }
        }
      }

      // If there are any errors, throw a validation error
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  /**
   * Pagination query parameters
   */
  pagination: z.object({
    limit: z.coerce.number().int().positive().max(1000).default(100),
    offset: z.coerce.number().int().nonnegative().default(0)
  }),

  /**
   * ID parameter (numeric)
   */
  id: z.object({
    id: z.coerce.number().int().positive()
  }),

  /**
   * UUID parameter
   */
  uuid: z.object({
    id: z.string().uuid()
  }),

  /**
   * Date range query
   */
  dateRange: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional()
  }),

  /**
   * Search query
   */
  search: z.object({
    q: z.string().min(1).max(200),
    limit: z.coerce.number().int().positive().max(100).default(20)
  }),

  /**
   * Sort parameters
   */
  sort: z.object({
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).default('asc')
  })
};

/**
 * Create a custom validation function
 */
export function createValidator<T>(
  validationFn: (data: any) => T | Promise<T>,
  target: ValidationTarget = 'body'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[target];
      const validated = await Promise.resolve(validationFn(dataToValidate));
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof Error) {
        next(new ValidationError(error.message));
      } else {
        next(new ValidationError('Validation failed'));
      }
    }
  };
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize request data
 */
export function sanitizeRequest(targets: ValidationTarget[] = ['body', 'query', 'params']) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const target of targets) {
      if (req[target]) {
        req[target] = sanitizeObject(req[target]);
      }
    }
    next();
  };
}

// Made with Bob
