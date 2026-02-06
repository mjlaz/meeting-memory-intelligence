import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as repo from '../db/repo.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createMeetingSchema = z.object({
  title: z.string().min(1).max(200),
  meeting_type: z.enum(['standup', 'planning', 'retrospective', 'client', 'other']),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Invalid ISO date format'),
  duration_minutes: z.number().int().positive().optional(),
  location: z.string().max(200).optional(),
  cos_audio_key: z.string().optional(),
  cos_transcript_key: z.string().optional(),
  language: z.string().default('en-US'),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled')
});

const updateMeetingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  meeting_type: z.enum(['standup', 'planning', 'retrospective', 'client', 'other']).optional(),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Invalid ISO date format').optional(),
  duration_minutes: z.number().int().positive().optional(),
  location: z.string().max(200).optional(),
  cos_audio_key: z.string().optional(),
  cos_transcript_key: z.string().optional(),
  language: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional()
});

const createSpeakerSchema = z.object({
  speaker_label: z.string().min(1),
  speaker_name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  total_speaking_time_seconds: z.number().nonnegative().optional()
});

// ============================================================================
// MEETING ROUTES
// ============================================================================

/**
 * POST /meetings
 * Create a new meeting
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createMeetingSchema.parse(req.body);
    const meetingId = repo.createMeeting(validated as repo.Meeting);
    const meeting = repo.getMeeting(meetingId);
    
    res.status(201).json({
      success: true,
      meeting,
      message: 'Meeting created successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error creating meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meeting'
    });
  }
});

/**
 * GET /meetings
 * Get all meetings with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const meetings = repo.getAllMeetings(limit, offset);
    
    res.json({
      success: true,
      meetings,
      pagination: {
        limit,
        offset,
        count: meetings.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meetings'
    });
  }
});

/**
 * GET /meetings/:id
 * Get a specific meeting by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid meeting ID'
      });
    }
    
    const meeting = repo.getMeeting(id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    res.json({
      success: true,
      meeting
    });
  } catch (error: any) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meeting'
    });
  }
});

/**
 * PUT /meetings/:id
 * Update a meeting
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid meeting ID'
      });
    }
    
    const meeting = repo.getMeeting(id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    const validated = updateMeetingSchema.parse(req.body);
    repo.updateMeeting(id, validated);
    
    const updated = repo.getMeeting(id);
    
    res.json({
      success: true,
      meeting: updated,
      message: 'Meeting updated successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error updating meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meeting'
    });
  }
});

/**
 * DELETE /meetings/:id
 * Delete a meeting (cascades to speakers, transcripts, etc.)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid meeting ID'
      });
    }
    
    const meeting = repo.getMeeting(id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    repo.deleteMeeting(id);
    
    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meeting'
    });
  }
});

/**
 * GET /meetings/:id/stats
 * Get statistics for a specific meeting
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid meeting ID'
      });
    }
    
    const meeting = repo.getMeeting(id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    const stats = repo.getMeetingStats(id);
    
    res.json({
      success: true,
      meeting_id: id,
      stats
    });
  } catch (error: any) {
    console.error('Error fetching meeting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meeting stats'
    });
  }
});

// ============================================================================
// SPEAKER ROUTES
// ============================================================================

/**
 * POST /meetings/:id/speakers
 * Add a speaker to a meeting
 */
router.post('/:id/speakers', async (req: Request, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
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
    
    const validated = createSpeakerSchema.parse(req.body);
    const speakerId = repo.createSpeaker({
      meeting_id: meetingId,
      ...validated
    } as repo.Speaker);
    
    res.status(201).json({
      success: true,
      speaker_id: speakerId,
      message: 'Speaker added successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error adding speaker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add speaker'
    });
  }
});

/**
 * GET /meetings/:id/speakers
 * Get all speakers for a meeting
 */
router.get('/:id/speakers', async (req: Request, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
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
    
    const speakers = repo.getSpeakersByMeeting(meetingId);
    
    res.json({
      success: true,
      meeting_id: meetingId,
      speakers
    });
  } catch (error: any) {
    console.error('Error fetching speakers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch speakers'
    });
  }
});

/**
 * GET /meetings/:id/transcript
 * Get full transcript for a meeting
 */
router.get('/:id/transcript', async (req: Request, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
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
    
    const segments = repo.getTranscriptByMeeting(meetingId);
    const fullText = repo.getFullTranscriptText(meetingId);
    
    res.json({
      success: true,
      meeting_id: meetingId,
      full_text: fullText,
      segments
    });
  } catch (error: any) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transcript'
    });
  }
});

export default router;

// Made with Bob
