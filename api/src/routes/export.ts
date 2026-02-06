import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/repo.js';

const r = Router();

/**
 * GET /export/csv/actions
 * Export actions as CSV file
 */
r.get('/csv/actions', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const acts = db.prepare('SELECT owner, description, due_date, confidence, created_at FROM actions').all();
    
    if (acts.length === 0) {
      return res.status(404).json({
        error: 'No actions found to export',
        code: 'NO_DATA'
      });
    }
    
    // Create CSV with proper escaping
    const csv = ['owner,description,due_date,confidence,created_at']
      .concat(acts.map((a: any) => {
        const escapeCsv = (val: any) => {
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        
        return [
          escapeCsv(a.owner),
          escapeCsv(a.description),
          escapeCsv(a.due_date),
          escapeCsv(a.confidence),
          escapeCsv(a.created_at)
        ].join(',');
      }))
      .join('\n');
    
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="actions_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    next(error);
  }
});

/**
 * GET /export/csv/decisions
 * Export decisions as CSV file
 */
r.get('/csv/decisions', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const decs = db.prepare('SELECT summary, rationale, date, created_at FROM decisions').all();
    
    if (decs.length === 0) {
      return res.status(404).json({
        error: 'No decisions found to export',
        code: 'NO_DATA'
      });
    }
    
    const csv = ['summary,rationale,date,created_at']
      .concat(decs.map((d: any) => {
        const escapeCsv = (val: any) => {
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        
        return [
          escapeCsv(d.summary),
          escapeCsv(d.rationale),
          escapeCsv(d.date),
          escapeCsv(d.created_at)
        ].join(',');
      }))
      .join('\n');
    
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="decisions_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    next(error);
  }
});

/**
 * GET /export/csv/risks
 * Export risks as CSV file
 */
r.get('/csv/risks', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const risks = db.prepare('SELECT summary, severity, owner_if_any, created_at FROM risks').all();
    
    if (risks.length === 0) {
      return res.status(404).json({
        error: 'No risks found to export',
        code: 'NO_DATA'
      });
    }
    
    const csv = ['summary,severity,owner,created_at']
      .concat(risks.map((r: any) => {
        const escapeCsv = (val: any) => {
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        
        return [
          escapeCsv(r.summary),
          escapeCsv(r.severity),
          escapeCsv(r.owner_if_any),
          escapeCsv(r.created_at)
        ].join(',');
      }))
      .join('\n');
    
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="risks_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    next(error);
  }
});

/**
 * GET /export/json/facts
 * Export all facts as JSON
 */
r.get('/json/facts', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const acts = db.prepare('SELECT * FROM actions').all();
    const decs = db.prepare('SELECT * FROM decisions').all();
    const risks = db.prepare('SELECT * FROM risks').all();
    
    const totalItems = acts.length + decs.length + risks.length;
    
    if (totalItems === 0) {
      return res.status(404).json({
        error: 'No data found to export',
        code: 'NO_DATA'
      });
    }
    
    res.json({ 
      ok: true,
      actions: acts, 
      decisions: decs, 
      risks,
      metadata: {
        exportedAt: new Date().toISOString(),
        counts: {
          actions: acts.length,
          decisions: decs.length,
          risks: risks.length,
          total: totalItems
        }
      }
    });
  } catch (error) {
    console.error('JSON export error:', error);
    next(error);
  }
});

export default r;

// Made with Bob
