import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as docgen from '../services/docgen.js';
import * as repo from '../db/repo.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const generateMinutesSchema = z.object({
  meeting_id: z.number().int().positive(),
  format: z.enum(['markdown', 'html', 'text']).default('markdown'),
  include_transcript: z.boolean().default(false),
  include_timestamps: z.boolean().default(true),
  include_confidence: z.boolean().default(false),
  template: z.enum(['formal', 'casual', 'executive']).default('formal')
});

const actionReportSchema = z.object({
  owner: z.string().optional()
});

const executiveSummarySchema = z.object({
  meeting_ids: z.array(z.number().int().positive()).min(1),
  format: z.enum(['markdown', 'html', 'text']).default('markdown')
});

// ============================================================================
// DOCUMENT GENERATION ROUTES
// ============================================================================

/**
 * POST /documents/minutes
 * Generate meeting minutes for a specific meeting
 */
router.post('/minutes', async (req: Request, res: Response) => {
  try {
    const validated = generateMinutesSchema.parse(req.body);
    
    // Check if meeting exists
    const meeting = repo.getMeeting(validated.meeting_id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    const document = await docgen.generateMeetingMinutes(
      validated.meeting_id,
      {
        format: validated.format,
        includeTranscript: validated.include_transcript,
        includeTimestamps: validated.include_timestamps,
        includeConfidence: validated.include_confidence,
        template: validated.template
      }
    );
    
    // Set appropriate content type
    const contentType = validated.format === 'html' 
      ? 'text/html' 
      : validated.format === 'markdown'
      ? 'text/markdown'
      : 'text/plain';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="meeting-minutes-${validated.meeting_id}.${validated.format === 'html' ? 'html' : validated.format === 'markdown' ? 'md' : 'txt'}"`);
    
    res.send(document);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error generating meeting minutes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate meeting minutes'
    });
  }
});

/**
 * GET /documents/minutes/:meeting_id
 * Generate meeting minutes via GET request (default format)
 */
router.get('/minutes/:meeting_id', async (req: Request, res: Response) => {
  try {
    const meetingId = parseInt(req.params.meeting_id);
    if (isNaN(meetingId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid meeting ID'
      });
    }
    
    const format = (req.query.format as string) || 'markdown';
    if (!['markdown', 'html', 'text'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Must be markdown, html, or text'
      });
    }
    
    const meeting = repo.getMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    const document = await docgen.generateMeetingMinutes(meetingId, {
      format: format as 'markdown' | 'html' | 'text',
      includeTranscript: req.query.include_transcript === 'true',
      includeTimestamps: req.query.include_timestamps !== 'false',
      template: (req.query.template as any) || 'formal'
    });
    
    const contentType = format === 'html' 
      ? 'text/html' 
      : format === 'markdown'
      ? 'text/markdown'
      : 'text/plain';
    
    res.setHeader('Content-Type', contentType);
    res.send(document);
  } catch (error: any) {
    console.error('Error generating meeting minutes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate meeting minutes'
    });
  }
});

/**
 * POST /documents/action-report
 * Generate action item report
 */
router.post('/action-report', async (req: Request, res: Response) => {
  try {
    const validated = actionReportSchema.parse(req.body);
    
    const document = docgen.generateActionReport(validated.owner);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="action-report${validated.owner ? `-${validated.owner}` : ''}.md"`);
    
    res.send(document);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error generating action report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate action report'
    });
  }
});

/**
 * GET /documents/action-report
 * Generate action item report via GET
 */
router.get('/action-report', async (req: Request, res: Response) => {
  try {
    const owner = req.query.owner as string | undefined;
    
    const document = docgen.generateActionReport(owner);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.send(document);
  } catch (error: any) {
    console.error('Error generating action report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate action report'
    });
  }
});

/**
 * GET /documents/risk-report
 * Generate risk assessment report
 */
router.get('/risk-report', async (req: Request, res: Response) => {
  try {
    const document = docgen.generateRiskReport();
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="risk-report.md"');
    
    res.send(document);
  } catch (error: any) {
    console.error('Error generating risk report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate risk report'
    });
  }
});

/**
 * POST /documents/executive-summary
 * Generate executive summary across multiple meetings
 */
router.post('/executive-summary', async (req: Request, res: Response) => {
  try {
    const validated = executiveSummarySchema.parse(req.body);
    
    // Verify all meetings exist
    const invalidMeetings = validated.meeting_ids.filter(id => !repo.getMeeting(id));
    if (invalidMeetings.length > 0) {
      return res.status(404).json({
        success: false,
        error: 'Some meetings not found',
        invalid_meeting_ids: invalidMeetings
      });
    }
    
    const document = docgen.generateExecutiveSummary(validated.meeting_ids);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="executive-summary.md"');
    
    res.send(document);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error generating executive summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate executive summary'
    });
  }
});

/**
 * GET /documents/templates
 * List available document templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      templates: {
        meeting_minutes: {
          formats: ['markdown', 'html', 'text'],
          templates: ['formal', 'casual', 'executive'],
          options: {
            include_transcript: 'boolean',
            include_timestamps: 'boolean',
            include_confidence: 'boolean'
          }
        },
        action_report: {
          formats: ['markdown'],
          options: {
            owner: 'string (optional - filter by owner)'
          }
        },
        risk_report: {
          formats: ['markdown']
        },
        executive_summary: {
          formats: ['markdown'],
          options: {
            meeting_ids: 'array of meeting IDs'
          }
        }
      }
    });
  } catch (error: any) {
    console.error('Error listing templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list templates'
    });
  }
});

/**
 * GET /documents/preview/:meeting_id
 * Preview meeting minutes without downloading
 */
router.get('/preview/:meeting_id', async (req: Request, res: Response) => {
  try {
    const meetingId = parseInt(req.params.meeting_id);
    if (isNaN(meetingId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid meeting ID'
      });
    }
    
    const meeting = repo.getMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    const document = await docgen.generateMeetingMinutes(meetingId, {
      format: 'markdown',
      includeTranscript: false,
      includeTimestamps: true,
      template: 'formal'
    });
    
    res.json({
      success: true,
      meeting_id: meetingId,
      meeting_title: meeting.title,
      preview: document,
      format: 'markdown'
    });
  } catch (error: any) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate preview'
    });
  }
});

export default router;

// Made with Bob
