
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';

// Import routes
import ingest from './routes/ingest.js';
import transcribe from './routes/transcribe.js';
import processRoute from './routes/process.js';
import insights from './routes/insights.js';
import exportRoute from './routes/export.js';
import meetings from './routes/meetings.js';
import documents from './routes/documents.js';
import analyticsRoute from './routes/analytics.js';
import mcpRoute from './routes/mcp.js';

// Import database and services
import { init as initDb } from './db/repo.js';
import { initMCPDirectories } from './services/mcp.js';

// Import middleware
import { logger } from './utils/logger.js';
import {
  errorHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection
} from './middleware/errorHandler.js';
import { applySecurity } from './middleware/security.js';
import {
  apiRateLimiter,
  uploadRateLimiter,
  expensiveOperationRateLimiter
} from './middleware/rateLimiter.js';

const app = express();

// Setup global error handlers
handleUncaughtException();
handleUnhandledRejection();

// ============================================================================
// SECURITY & CORE MIDDLEWARE (Order matters!)
// ============================================================================

// 1. Security headers, CORS, request ID, and sanitization
app.use(applySecurity({
  headers: {
    contentSecurityPolicy: true,
    frameOptions: 'SAMEORIGIN',
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true
    }
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  },
  sanitize: true,
  requestId: true,
  requestLogging: false // We'll use our custom logger below
}));

// 2. Body parser with size limits
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// 3. Custom request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ============================================================================
// STATIC FILES
// ============================================================================

app.use('/', express.static(path.resolve(process.cwd(), '../web')));

// ============================================================================
// HEALTH CHECK (No rate limiting)
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    version: '0.1.0'
  });
});

// ============================================================================
// API ROUTES WITH RATE LIMITING
// ============================================================================

// Apply general API rate limiting to all API routes
app.use('/ingest', uploadRateLimiter, ingest);
app.use('/transcribe', uploadRateLimiter, transcribe);
app.use('/process', expensiveOperationRateLimiter, processRoute);
app.use('/insights', expensiveOperationRateLimiter, insights);
app.use('/export', apiRateLimiter, exportRoute);
app.use('/meetings', apiRateLimiter, meetings);
app.use('/documents', apiRateLimiter, documents);
app.use('/analytics', apiRateLimiter, analyticsRoute);
app.use('/mcp', apiRateLimiter, mcpRoute);

// ============================================================================
// ERROR HANDLING (Must be last!)
// ============================================================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize database
try {
  initDb();
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database', error as Error);
  process.exit(1);
}

// Initialize MCP directories
try {
  await initMCPDirectories();
  logger.info('MCP directories initialized successfully');
} catch (error) {
  logger.warn('Failed to initialize MCP directories', { error });
  // Don't exit - MCP is optional
}

// ============================================================================
// START SERVER
// ============================================================================

const port = Number(process.env.PORT || 8080);
const server = app.listen(port, () => {
  logger.info('Server started successfully', {
    port,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  
  console.log(`
╔════════════════════════════════════════════════════════╗
║  Meeting Memory Intelligence Engine API               ║
║  Port: ${port}                                        ║
║  Environment: ${process.env.NODE_ENV || 'development'}                              ║
║  Time: ${new Date().toISOString()}          ║
║                                                        ║
║  Security: ✓ Headers, CORS, Sanitization              ║
║  Rate Limiting: ✓ Enabled                             ║
║  Error Handling: ✓ Global handlers active             ║
╚════════════════════════════════════════════════════════╝
  `);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
