import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as mcp from '../services/mcp.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const exportSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string(),
  directory: z.enum(['exports', 'evidence', 'logs']).default('exports'),
  metadata: z.record(z.any()).optional()
});

const cleanExportsSchema = z.object({
  days: z.number().int().positive().max(365).default(30)
});

// ============================================================================
// MCP ROUTES
// ============================================================================

/**
 * GET /mcp/status
 * Get MCP status and configuration
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = mcp.getMCPStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error: any) {
    console.error('Error getting MCP status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get MCP status'
    });
  }
});

/**
 * POST /mcp/export
 * Export content via MCP
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const validated = exportSchema.parse(req.body);
    
    const result = await mcp.mcpExport(validated);
    
    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error exporting via MCP:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export via MCP'
    });
  }
});

/**
 * GET /mcp/exports
 * List all exported files
 */
router.get('/exports', async (req: Request, res: Response) => {
  try {
    const exports = await mcp.listExports();
    
    res.json({
      success: true,
      exports,
      count: exports.length
    });
  } catch (error: any) {
    console.error('Error listing exports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list exports'
    });
  }
});

/**
 * GET /mcp/exports/:filename
 * Read a specific exported file
 */
router.get('/exports/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }
    
    const content = await mcp.readExport(filename);
    
    // Determine content type based on extension
    const ext = filename.split('.').pop()?.toLowerCase();
    let contentType = 'text/plain';
    
    if (ext === 'json') contentType = 'application/json';
    else if (ext === 'html') contentType = 'text/html';
    else if (ext === 'md') contentType = 'text/markdown';
    else if (ext === 'csv') contentType = 'text/csv';
    
    res.setHeader('Content-Type', contentType);
    res.send(content);
  } catch (error: any) {
    console.error('Error reading export:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Export not found'
    });
  }
});

/**
 * DELETE /mcp/exports/:filename
 * Delete a specific exported file
 */
router.delete('/exports/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }
    
    await mcp.deleteExport(filename);
    
    res.json({
      success: true,
      message: 'Export deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting export:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete export'
    });
  }
});

/**
 * POST /mcp/exports/clean
 * Clean old exports
 */
router.post('/exports/clean', async (req: Request, res: Response) => {
  try {
    const validated = cleanExportsSchema.parse(req.body);
    
    const deletedCount = await mcp.cleanOldExports(validated.days);
    
    res.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} old export(s)`
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error cleaning exports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean old exports'
    });
  }
});

/**
 * GET /mcp/evidence
 * Get recent evidence entries
 */
router.get('/evidence', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    
    const evidence = await mcp.getRecentEvidence(limit);
    
    res.json({
      success: true,
      evidence,
      count: evidence.length
    });
  } catch (error: any) {
    console.error('Error getting evidence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get evidence'
    });
  }
});

/**
 * GET /mcp/evidence/:operation
 * Get evidence by operation type
 */
router.get('/evidence/:operation', async (req: Request, res: Response) => {
  try {
    const operation = req.params.operation;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const evidence = await mcp.getEvidenceByOperation(operation, limit);
    
    res.json({
      success: true,
      operation,
      evidence,
      count: evidence.length
    });
  } catch (error: any) {
    console.error('Error getting evidence by operation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get evidence by operation'
    });
  }
});

/**
 * GET /mcp/evidence/stats
 * Get evidence statistics
 */
router.get('/evidence-stats', async (req: Request, res: Response) => {
  try {
    const stats = await mcp.getEvidenceStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('Error getting evidence stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get evidence statistics'
    });
  }
});

/**
 * GET /mcp/report
 * Generate MCP usage report
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    const report = await mcp.generateMCPReport();
    
    res.setHeader('Content-Type', 'text/markdown');
    res.send(report);
  } catch (error: any) {
    console.error('Error generating MCP report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate MCP report'
    });
  }
});

/**
 * POST /mcp/log/api
 * Log API operation (for testing/manual logging)
 */
router.post('/log/api', async (req: Request, res: Response) => {
  try {
    const { endpoint, method, statusCode, duration, metadata } = req.body;
    
    await mcp.logAPIOperation(endpoint, method, statusCode, duration, metadata);
    
    res.json({
      success: true,
      message: 'API operation logged'
    });
  } catch (error: any) {
    console.error('Error logging API operation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log API operation'
    });
  }
});

/**
 * POST /mcp/log/document
 * Log document generation (for testing/manual logging)
 */
router.post('/log/document', async (req: Request, res: Response) => {
  try {
    const { documentType, meetingId, success, error } = req.body;
    
    await mcp.logDocumentGeneration(documentType, meetingId, success, error);
    
    res.json({
      success: true,
      message: 'Document generation logged'
    });
  } catch (error: any) {
    console.error('Error logging document generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log document generation'
    });
  }
});

export default router;

// Made with Bob
