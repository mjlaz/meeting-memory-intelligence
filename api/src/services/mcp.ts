/**
 * MCP (Model Context Protocol) Integration Service
 * 
 * Provides filesystem operations through MCP for:
 * - Exporting documents and reports
 * - Capturing tool usage evidence
 * - Logging operations for audit trails
 * - Creating verifiable artifacts
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// ============================================================================
// TYPES
// ============================================================================

export interface MCPExportOptions {
  filename: string;
  content: string;
  directory?: 'exports' | 'evidence' | 'logs';
  metadata?: Record<string, any>;
}

export interface MCPExportResult {
  success: boolean;
  filepath: string;
  size: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MCPEvidenceEntry {
  timestamp: string;
  operation: string;
  user?: string;
  details: Record<string, any>;
  result: 'success' | 'failure';
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MCP_BASE_DIR = process.cwd();
const EXPORTS_DIR = path.join(MCP_BASE_DIR, 'exports');
const EVIDENCE_DIR = path.join(MCP_BASE_DIR, '.bob');
const LOGS_DIR = path.join(MCP_BASE_DIR, 'logs');

/**
 * Initialize MCP directories
 */
export async function initMCPDirectories(): Promise<void> {
  try {
    await fs.mkdir(EXPORTS_DIR, { recursive: true });
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    await fs.mkdir(LOGS_DIR, { recursive: true });
    
    console.log('MCP directories initialized:', {
      exports: EXPORTS_DIR,
      evidence: EVIDENCE_DIR,
      logs: LOGS_DIR
    });
  } catch (error) {
    console.error('Failed to initialize MCP directories:', error);
    throw error;
  }
}

// ============================================================================
// EXPORT OPERATIONS
// ============================================================================

/**
 * Export content to filesystem via MCP
 */
export async function mcpExport(options: MCPExportOptions): Promise<MCPExportResult> {
  const { filename, content, directory = 'exports', metadata } = options;
  
  // Determine target directory
  let targetDir: string;
  switch (directory) {
    case 'exports':
      targetDir = EXPORTS_DIR;
      break;
    case 'evidence':
      targetDir = EVIDENCE_DIR;
      break;
    case 'logs':
      targetDir = LOGS_DIR;
      break;
    default:
      targetDir = EXPORTS_DIR;
  }
  
  // Sanitize filename
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filepath = path.join(targetDir, sanitizedFilename);
  
  try {
    // Write file
    await fs.writeFile(filepath, content, 'utf-8');
    
    // Get file stats
    const stats = await fs.stat(filepath);
    
    const result: MCPExportResult = {
      success: true,
      filepath,
      size: stats.size,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    // Log evidence
    await logEvidence({
      timestamp: result.timestamp,
      operation: 'mcp_export',
      details: {
        filename: sanitizedFilename,
        directory,
        size: stats.size,
        metadata
      },
      result: 'success'
    });
    
    return result;
  } catch (error: any) {
    // Log failure
    await logEvidence({
      timestamp: new Date().toISOString(),
      operation: 'mcp_export',
      details: {
        filename: sanitizedFilename,
        directory
      },
      result: 'failure',
      error: error.message
    });
    
    throw new Error(`MCP export failed: ${error.message}`);
  }
}

/**
 * Export meeting minutes via MCP
 */
export async function exportMeetingMinutes(
  meetingId: number,
  content: string,
  format: 'markdown' | 'html' | 'text'
): Promise<MCPExportResult> {
  const extension = format === 'html' ? 'html' : format === 'markdown' ? 'md' : 'txt';
  const filename = `meeting-minutes-${meetingId}-${Date.now()}.${extension}`;
  
  return mcpExport({
    filename,
    content,
    directory: 'exports',
    metadata: {
      type: 'meeting_minutes',
      meetingId,
      format,
      generatedAt: new Date().toISOString()
    }
  });
}

/**
 * Export action report via MCP
 */
export async function exportActionReport(
  content: string,
  owner?: string
): Promise<MCPExportResult> {
  const filename = `action-report${owner ? `-${owner}` : ''}-${Date.now()}.md`;
  
  return mcpExport({
    filename,
    content,
    directory: 'exports',
    metadata: {
      type: 'action_report',
      owner,
      generatedAt: new Date().toISOString()
    }
  });
}

/**
 * Export risk report via MCP
 */
export async function exportRiskReport(content: string): Promise<MCPExportResult> {
  const filename = `risk-report-${Date.now()}.md`;
  
  return mcpExport({
    filename,
    content,
    directory: 'exports',
    metadata: {
      type: 'risk_report',
      generatedAt: new Date().toISOString()
    }
  });
}

/**
 * Export executive summary via MCP
 */
export async function exportExecutiveSummary(
  content: string,
  meetingIds: number[]
): Promise<MCPExportResult> {
  const filename = `executive-summary-${Date.now()}.md`;
  
  return mcpExport({
    filename,
    content,
    directory: 'exports',
    metadata: {
      type: 'executive_summary',
      meetingIds,
      generatedAt: new Date().toISOString()
    }
  });
}

/**
 * Export analytics data via MCP
 */
export async function exportAnalytics(
  content: string,
  analyticsType: string
): Promise<MCPExportResult> {
  const filename = `analytics-${analyticsType}-${Date.now()}.json`;
  
  return mcpExport({
    filename,
    content,
    directory: 'exports',
    metadata: {
      type: 'analytics',
      analyticsType,
      generatedAt: new Date().toISOString()
    }
  });
}

/**
 * Export CSV data via MCP
 */
export async function exportCSV(
  content: string,
  dataType: string
): Promise<MCPExportResult> {
  const filename = `${dataType}-${Date.now()}.csv`;
  
  return mcpExport({
    filename,
    content,
    directory: 'exports',
    metadata: {
      type: 'csv_export',
      dataType,
      generatedAt: new Date().toISOString()
    }
  });
}

// ============================================================================
// EVIDENCE LOGGING
// ============================================================================

/**
 * Log tool usage evidence
 */
export async function logEvidence(entry: MCPEvidenceEntry): Promise<void> {
  const evidenceFile = path.join(EVIDENCE_DIR, 'tool_usage_evidence.jsonl');
  
  try {
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(evidenceFile, line, 'utf-8');
  } catch (error) {
    console.error('Failed to log evidence:', error);
    // Don't throw - evidence logging should not break operations
  }
}

/**
 * Log API operation
 */
export async function logAPIOperation(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, any>
): Promise<void> {
  await logEvidence({
    timestamp: new Date().toISOString(),
    operation: 'api_call',
    details: {
      endpoint,
      method,
      statusCode,
      duration,
      ...metadata
    },
    result: statusCode < 400 ? 'success' : 'failure'
  });
}

/**
 * Log document generation
 */
export async function logDocumentGeneration(
  documentType: string,
  meetingId?: number,
  success: boolean = true,
  error?: string
): Promise<void> {
  await logEvidence({
    timestamp: new Date().toISOString(),
    operation: 'document_generation',
    details: {
      documentType,
      meetingId
    },
    result: success ? 'success' : 'failure',
    error
  });
}

/**
 * Log analytics query
 */
export async function logAnalyticsQuery(
  queryType: string,
  parameters: Record<string, any>,
  success: boolean = true
): Promise<void> {
  await logEvidence({
    timestamp: new Date().toISOString(),
    operation: 'analytics_query',
    details: {
      queryType,
      parameters
    },
    result: success ? 'success' : 'failure'
  });
}

/**
 * Log transcription operation
 */
export async function logTranscription(
  audioKey: string,
  language: string,
  duration?: number,
  success: boolean = true,
  error?: string
): Promise<void> {
  await logEvidence({
    timestamp: new Date().toISOString(),
    operation: 'transcription',
    details: {
      audioKey,
      language,
      duration
    },
    result: success ? 'success' : 'failure',
    error
  });
}

/**
 * Log fact extraction
 */
export async function logFactExtraction(
  meetingId?: number,
  actionsCount?: number,
  decisionsCount?: number,
  risksCount?: number,
  success: boolean = true,
  error?: string
): Promise<void> {
  await logEvidence({
    timestamp: new Date().toISOString(),
    operation: 'fact_extraction',
    details: {
      meetingId,
      actionsCount,
      decisionsCount,
      risksCount
    },
    result: success ? 'success' : 'failure',
    error
  });
}

// ============================================================================
// EVIDENCE RETRIEVAL
// ============================================================================

/**
 * Get recent evidence entries
 */
export async function getRecentEvidence(limit: number = 100): Promise<MCPEvidenceEntry[]> {
  const evidenceFile = path.join(EVIDENCE_DIR, 'tool_usage_evidence.jsonl');
  
  try {
    const content = await fs.readFile(evidenceFile, 'utf-8');
    const lines = content.trim().split('\n');
    const entries = lines
      .slice(-limit)
      .map(line => {
        try {
          return JSON.parse(line) as MCPEvidenceEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is MCPEvidenceEntry => entry !== null);
    
    return entries.reverse(); // Most recent first
  } catch (error) {
    // File doesn't exist yet or is empty
    return [];
  }
}

/**
 * Get evidence by operation type
 */
export async function getEvidenceByOperation(
  operation: string,
  limit: number = 50
): Promise<MCPEvidenceEntry[]> {
  const allEvidence = await getRecentEvidence(1000);
  return allEvidence
    .filter(entry => entry.operation === operation)
    .slice(0, limit);
}

/**
 * Get evidence statistics
 */
export async function getEvidenceStats(): Promise<{
  total: number;
  byOperation: Record<string, number>;
  byResult: Record<string, number>;
  recentFailures: MCPEvidenceEntry[];
}> {
  const allEvidence = await getRecentEvidence(1000);
  
  const byOperation: Record<string, number> = {};
  const byResult: Record<string, number> = {};
  const recentFailures: MCPEvidenceEntry[] = [];
  
  allEvidence.forEach(entry => {
    // Count by operation
    byOperation[entry.operation] = (byOperation[entry.operation] || 0) + 1;
    
    // Count by result
    byResult[entry.result] = (byResult[entry.result] || 0) + 1;
    
    // Collect recent failures
    if (entry.result === 'failure' && recentFailures.length < 10) {
      recentFailures.push(entry);
    }
  });
  
  return {
    total: allEvidence.length,
    byOperation,
    byResult,
    recentFailures
  };
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * List exported files
 */
export async function listExports(): Promise<Array<{
  filename: string;
  size: number;
  created: Date;
  modified: Date;
}>> {
  try {
    const files = await fs.readdir(EXPORTS_DIR);
    const fileStats = await Promise.all(
      files.map(async (filename) => {
        const filepath = path.join(EXPORTS_DIR, filename);
        const stats = await fs.stat(filepath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
    );
    
    return fileStats.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  } catch (error) {
    console.error('Failed to list exports:', error);
    return [];
  }
}

/**
 * Read exported file
 */
export async function readExport(filename: string): Promise<string> {
  const filepath = path.join(EXPORTS_DIR, filename);
  
  try {
    return await fs.readFile(filepath, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to read export: ${error.message}`);
  }
}

/**
 * Delete exported file
 */
export async function deleteExport(filename: string): Promise<void> {
  const filepath = path.join(EXPORTS_DIR, filename);
  
  try {
    await fs.unlink(filepath);
    
    await logEvidence({
      timestamp: new Date().toISOString(),
      operation: 'delete_export',
      details: { filename },
      result: 'success'
    });
  } catch (error: any) {
    await logEvidence({
      timestamp: new Date().toISOString(),
      operation: 'delete_export',
      details: { filename },
      result: 'failure',
      error: error.message
    });
    
    throw new Error(`Failed to delete export: ${error.message}`);
  }
}

/**
 * Clean old exports (older than specified days)
 */
export async function cleanOldExports(days: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  try {
    const files = await listExports();
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.modified < cutoffDate) {
        await deleteExport(file.filename);
        deletedCount++;
      }
    }
    
    await logEvidence({
      timestamp: new Date().toISOString(),
      operation: 'clean_old_exports',
      details: {
        days,
        deletedCount
      },
      result: 'success'
    });
    
    return deletedCount;
  } catch (error: any) {
    await logEvidence({
      timestamp: new Date().toISOString(),
      operation: 'clean_old_exports',
      details: { days },
      result: 'failure',
      error: error.message
    });
    
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get MCP status and configuration
 */
export function getMCPStatus() {
  return {
    enabled: true,
    directories: {
      exports: EXPORTS_DIR,
      evidence: EVIDENCE_DIR,
      logs: LOGS_DIR
    },
    features: {
      fileExports: true,
      evidenceLogging: true,
      auditTrail: true
    }
  };
}

/**
 * Generate MCP usage report
 */
export async function generateMCPReport(): Promise<string> {
  const stats = await getEvidenceStats();
  const exports = await listExports();
  const status = getMCPStatus();
  
  const lines: string[] = [];
  
  lines.push('# MCP Usage Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  lines.push('## Status');
  lines.push('');
  lines.push(`- Enabled: ${status.enabled}`);
  lines.push(`- Exports Directory: ${status.directories.exports}`);
  lines.push(`- Evidence Directory: ${status.directories.evidence}`);
  lines.push('');
  
  lines.push('## Evidence Statistics');
  lines.push('');
  lines.push(`- Total Operations: ${stats.total}`);
  lines.push(`- Successful: ${stats.byResult.success || 0}`);
  lines.push(`- Failed: ${stats.byResult.failure || 0}`);
  lines.push('');
  
  lines.push('### Operations by Type');
  lines.push('');
  Object.entries(stats.byOperation)
    .sort((a, b) => b[1] - a[1])
    .forEach(([op, count]) => {
      lines.push(`- ${op}: ${count}`);
    });
  lines.push('');
  
  if (stats.recentFailures.length > 0) {
    lines.push('### Recent Failures');
    lines.push('');
    stats.recentFailures.forEach((failure, idx) => {
      lines.push(`${idx + 1}. ${failure.operation} at ${failure.timestamp}`);
      if (failure.error) {
        lines.push(`   Error: ${failure.error}`);
      }
    });
    lines.push('');
  }
  
  lines.push('## Exported Files');
  lines.push('');
  lines.push(`Total: ${exports.length}`);
  lines.push('');
  
  if (exports.length > 0) {
    lines.push('### Recent Exports');
    lines.push('');
    exports.slice(0, 10).forEach((file, idx) => {
      const sizeKB = (file.size / 1024).toFixed(2);
      lines.push(`${idx + 1}. ${file.filename} (${sizeKB} KB) - ${file.modified.toISOString()}`);
    });
  }
  
  return lines.join('\n');
}

// Made with Bob
