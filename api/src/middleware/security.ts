/**
 * Security middleware for headers, CORS, and request sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  /**
   * Content Security Policy
   */
  contentSecurityPolicy?: boolean | string;

  /**
   * X-Frame-Options
   */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;

  /**
   * X-Content-Type-Options
   */
  noSniff?: boolean;

  /**
   * X-XSS-Protection
   */
  xssProtection?: boolean;

  /**
   * Strict-Transport-Security
   */
  hsts?: boolean | {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };

  /**
   * Referrer-Policy
   */
  referrerPolicy?: string;

  /**
   * Permissions-Policy
   */
  permissionsPolicy?: string;
}

/**
 * Apply security headers to response
 */
export function securityHeaders(config: SecurityHeadersConfig = {}) {
  const {
    contentSecurityPolicy = true,
    frameOptions = 'SAMEORIGIN',
    noSniff = true,
    xssProtection = true,
    hsts = true,
    referrerPolicy = 'no-referrer',
    permissionsPolicy
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    // Content Security Policy
    if (contentSecurityPolicy) {
      const cspValue = typeof contentSecurityPolicy === 'string'
        ? contentSecurityPolicy
        : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;";
      res.setHeader('Content-Security-Policy', cspValue);
    }

    // X-Frame-Options
    if (frameOptions) {
      res.setHeader('X-Frame-Options', frameOptions);
    }

    // X-Content-Type-Options
    if (noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection
    if (xssProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Strict-Transport-Security (HSTS)
    if (hsts) {
      let hstsValue = 'max-age=31536000'; // 1 year default
      
      if (typeof hsts === 'object') {
        const maxAge = hsts.maxAge || 31536000;
        hstsValue = `max-age=${maxAge}`;
        
        if (hsts.includeSubDomains) {
          hstsValue += '; includeSubDomains';
        }
        
        if (hsts.preload) {
          hstsValue += '; preload';
        }
      }
      
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Referrer-Policy
    if (referrerPolicy) {
      res.setHeader('Referrer-Policy', referrerPolicy);
    }

    // Permissions-Policy
    if (permissionsPolicy) {
      res.setHeader('Permissions-Policy', permissionsPolicy);
    }

    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    next();
  };
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  /**
   * Allowed origins
   */
  origin?: string | string[] | ((origin: string) => boolean);

  /**
   * Allowed methods
   */
  methods?: string[];

  /**
   * Allowed headers
   */
  allowedHeaders?: string[];

  /**
   * Exposed headers
   */
  exposedHeaders?: string[];

  /**
   * Allow credentials
   */
  credentials?: boolean;

  /**
   * Max age for preflight cache
   */
  maxAge?: number;
}

/**
 * CORS middleware
 */
export function cors(config: CorsConfig = {}) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400 // 24 hours
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const requestOrigin = req.headers.origin || req.headers.referer;

    // Determine if origin is allowed
    let allowedOrigin = '*';
    
    if (typeof origin === 'string') {
      allowedOrigin = origin;
    } else if (Array.isArray(origin)) {
      if (requestOrigin && origin.includes(requestOrigin)) {
        allowedOrigin = requestOrigin;
      }
    } else if (typeof origin === 'function' && requestOrigin) {
      if (origin(requestOrigin)) {
        allowedOrigin = requestOrigin;
      }
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (methods.length > 0) {
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    }

    if (allowedHeaders.length > 0) {
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    }

    if (exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }

    res.setHeader('Access-Control-Max-Age', String(maxAge));

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  };
}

/**
 * Request sanitization to prevent common attacks
 */
export function sanitizeRequest() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  };
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj: any): any {
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
      // Sanitize key to prevent prototype pollution
      const sanitizedKey = sanitizeString(key);
      if (sanitizedKey !== '__proto__' && sanitizedKey !== 'constructor' && sanitizedKey !== 'prototype') {
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize string to prevent XSS
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;

  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Request logging middleware with sensitive data masking
 */
export function requestLogger(options: {
  /**
   * Log request body
   */
  logBody?: boolean;

  /**
   * Log response body
   */
  logResponse?: boolean;

  /**
   * Skip logging for certain paths
   */
  skip?: (req: Request) => boolean;
} = {}) {
  const { logBody = false, logResponse = false, skip } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (skip && skip(req)) {
      return next();
    }

    const startTime = Date.now();

    // Log request
    const requestLog: any = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    if (logBody && req.body) {
      requestLog.body = maskSensitiveData(req.body);
    }

    logger.info('Incoming request', requestLog);

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any): Response {
      const duration = Date.now() - startTime;

      const responseLog: any = {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      };

      if (logResponse && data) {
        try {
          responseLog.body = typeof data === 'string' ? JSON.parse(data) : data;
          responseLog.body = maskSensitiveData(responseLog.body);
        } catch (e) {
          // Ignore parse errors
        }
      }

      if (res.statusCode >= 400) {
        logger.warn('Request completed with error', responseLog);
      } else {
        logger.info('Request completed', responseLog);
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Mask sensitive data in objects
 */
function maskSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }

  const sensitiveFields = [
    'password',
    'apiKey',
    'api_key',
    'apikey',
    'token',
    'secret',
    'authorization',
    'auth',
    'bearer',
    'credentials',
    'credit_card',
    'creditCard',
    'ssn'
  ];

  const masked: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => 
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive && typeof value === 'string') {
      masked[key] = '***MASKED***';
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Add request ID to each request for tracing
 */
export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = generateRequestId();
    (req as any).id = id;
    res.setHeader('X-Request-ID', id);
    next();
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Prevent parameter pollution
 */
export function preventParameterPollution(whitelist: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value) && !whitelist.includes(key)) {
          // Take only the last value if not whitelisted
          req.query[key] = value[value.length - 1];
        }
      }
    }

    next();
  };
}

/**
 * Combined security middleware with sensible defaults
 */
export function applySecurity(config: {
  headers?: SecurityHeadersConfig;
  cors?: CorsConfig;
  sanitize?: boolean;
  requestLogging?: boolean;
  requestId?: boolean;
} = {}) {
  const middlewares: any[] = [];

  // Add request ID
  if (config.requestId !== false) {
    middlewares.push(requestId());
  }

  // Add security headers
  if (config.headers !== false) {
    middlewares.push(securityHeaders(config.headers || {}));
  }

  // Add CORS
  if (config.cors !== false) {
    middlewares.push(cors(config.cors || {}));
  }

  // Add request sanitization
  if (config.sanitize !== false) {
    middlewares.push(sanitizeRequest());
  }

  // Add request logging
  if (config.requestLogging) {
    middlewares.push(requestLogger());
  }

  // Return combined middleware
  return (req: Request, res: Response, next: NextFunction) => {
    let index = 0;

    const runNext = () => {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    };

    runNext();
  };
}

// Made with Bob
