
import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/repo.js';

const r = Router();

/**
 * GET /insights/timeline
 * Get chronological timeline of decisions
 */
r.get('/timeline', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const decisions = db.prepare('SELECT * FROM decisions ORDER BY date IS NULL, date, created_at').all();
    
    res.json({
      ok: true,
      decisions,
      count: decisions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Timeline query error:', error);
    next(error);
  }
});

/**
 * GET /insights/owners
 * Get action item counts by owner
 */
r.get('/owners', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = db.prepare(`
      SELECT
        owner,
        COUNT(*) as cnt,
        SUM(CASE WHEN confidence >= 0.8 THEN 1 ELSE 0 END) as high_confidence_count
      FROM actions
      GROUP BY owner
      ORDER BY cnt DESC
    `).all();
    
    res.json({
      ok: true,
      owners: rows,
      totalOwners: rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Owners query error:', error);
    next(error);
  }
});

/**
 * GET /insights/risks
 * Get all risks ordered by creation date
 */
r.get('/risks', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const risks = db.prepare('SELECT * FROM risks ORDER BY created_at DESC').all();
    
    // Group by severity
    const bySeverity = {
      high: risks.filter((r: any) => r.severity === 'high').length,
      med: risks.filter((r: any) => r.severity === 'med').length,
      low: risks.filter((r: any) => r.severity === 'low').length,
    };
    
    res.json({
      ok: true,
      risks,
      count: risks.length,
      bySeverity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Risks query error:', error);
    next(error);
  }
});

/**
 * GET /insights/actions
 * Get all actions ordered by due date
 */
r.get('/actions', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const actions = db.prepare('SELECT * FROM actions ORDER BY due_date IS NULL, due_date, created_at DESC').all();
    
    // Group by status
    const byStatus = {
      pending: actions.filter((a: any) => a.status === 'pending').length,
      in_progress: actions.filter((a: any) => a.status === 'in_progress').length,
      completed: actions.filter((a: any) => a.status === 'completed').length,
      cancelled: actions.filter((a: any) => a.status === 'cancelled').length,
    };
    
    res.json({
      ok: true,
      actions,
      count: actions.length,
      byStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Actions query error:', error);
    next(error);
  }
});

/**
 * GET /insights/decisions
 * Get all decisions ordered by date
 */
r.get('/decisions', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const decisions = db.prepare('SELECT * FROM decisions ORDER BY date IS NULL, date DESC, created_at DESC').all();
    
    res.json({
      ok: true,
      decisions,
      count: decisions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Decisions query error:', error);
    next(error);
  }
});

/**
 * GET /insights/summary
 * Get overall summary statistics
 */
r.get('/summary', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const actionCount = db.prepare('SELECT COUNT(*) as count FROM actions').get() as any;
    const decisionCount = db.prepare('SELECT COUNT(*) as count FROM decisions').get() as any;
    const riskCount = db.prepare('SELECT COUNT(*) as count FROM risks').get() as any;
    
    const highPriorityRisks = db.prepare(
      "SELECT COUNT(*) as count FROM risks WHERE severity = 'high'"
    ).get() as any;
    
    const recentActions = db.prepare(`
      SELECT * FROM actions
      ORDER BY created_at DESC
      LIMIT 5
    `).all();
    
    res.json({
      ok: true,
      summary: {
        totalActions: actionCount.count,
        totalDecisions: decisionCount.count,
        totalRisks: riskCount.count,
        highPriorityRisks: highPriorityRisks.count,
      },
      recentActions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Summary query error:', error);
    next(error);
  }
});

export default r;
