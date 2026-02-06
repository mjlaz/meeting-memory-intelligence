
import { Router } from 'express';
import { wxExtractText, wxExtractWithFallback } from '../services/wx.js';
import { FACTS_PROMPT, FACTS_PROMPT_V1, getPromptForMeetingType } from '../services/nlp.js';
import { parseFactsJson, sanitizeFacts, assessExtractionQuality } from '../utils/validators.js';
import { saveFacts } from '../db/repo.js';

const r = Router();

/**
 * POST /process
 * Process a meeting transcript and extract structured facts
 *
 * Body:
 * - transcriptText: string (required) - The meeting transcript
 * - meetingType: string (optional) - Type of meeting (standup, planning, retrospective, client)
 * - meetingId: number (optional) - ID of the meeting to associate facts with
 */
r.post('/', async (req, res, next) => {
  try {
    const { transcriptText, meetingType, meetingId } = req.body;

    // Validation
    if (!transcriptText) {
      return res.status(400).json({
        error: 'transcriptText required',
        code: 'MISSING_TRANSCRIPT'
      });
    }

    if (typeof transcriptText !== 'string') {
      return res.status(400).json({
        error: 'transcriptText must be a string',
        code: 'INVALID_TRANSCRIPT_TYPE'
      });
    }

    if (transcriptText.trim().length < 10) {
      return res.status(400).json({
        error: 'transcriptText too short (minimum 10 characters)',
        code: 'TRANSCRIPT_TOO_SHORT'
      });
    }

    // Get appropriate prompt based on meeting type
    const prompt = getPromptForMeetingType(meetingType);

    // Extract facts with fallback to v1 prompt if v2 fails
    console.log(`Processing transcript (${transcriptText.length} chars) with ${meetingType || 'default'} prompt`);
    const raw = await wxExtractWithFallback(
      transcriptText,
      prompt,
      FACTS_PROMPT_V1,
      { maxTokens: 800, temperature: 0.2, retries: 3 }
    );

    // Parse and validate JSON
    const facts = parseFactsJson(raw);

    // Sanitize data
    const sanitized = sanitizeFacts(facts);

    // Assess extraction quality
    const quality = assessExtractionQuality(sanitized);
    console.log(`Extraction quality: ${quality.score.toFixed(2)}, issues: ${quality.issues.length}`);

    // Save to database
    await saveFacts(sanitized);

    // Return results with quality metrics
    res.json({
      ok: true,
      facts: sanitized,
      quality: {
        score: quality.score,
        issues: quality.issues,
      },
      metadata: {
        itemCount: {
          actions: sanitized.actions.length,
          decisions: sanitized.decisions.length,
          risks: sanitized.risks.length,
          total: sanitized.actions.length + sanitized.decisions.length + sanitized.risks.length,
        },
        meetingType: meetingType || 'default',
        meetingId: meetingId || null,
      }
    });
  } catch (e) {
    console.error('Process route error:', e);
    next(e);
  }
});

export default r;
