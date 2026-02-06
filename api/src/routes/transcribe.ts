import { Router, Request, Response, NextFunction } from 'express';
import { transcribeAudio, getSupportedAudioFormats, getSupportedLanguages } from '../services/stt.js';
import { downloadObject } from '../services/cos.js';

const r = Router();

/**
 * POST /transcribe
 * Transcribe audio file using Watson Speech to Text
 *
 * Body:
 * - audioKey: string (required) - COS key of uploaded audio file
 * - language: string (optional) - Language code (default: en-US)
 * - speakerLabels: boolean (optional) - Enable speaker identification (default: true)
 * - maxSpeakers: number (optional) - Maximum number of speakers (default: 5)
 * - meetingId: number (optional) - ID to associate with this transcription
 */
r.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { audioKey, language, speakerLabels, maxSpeakers, meetingId } = req.body;

    // Validation
    if (!audioKey) {
      return res.status(400).json({
        error: 'audioKey is required',
        code: 'MISSING_AUDIO_KEY'
      });
    }

    if (typeof audioKey !== 'string') {
      return res.status(400).json({
        error: 'audioKey must be a string',
        code: 'INVALID_AUDIO_KEY'
      });
    }

    // Validate language if provided
    const supportedLanguages = getSupportedLanguages();
    const languageCode = language || 'en-US';
    const isValidLanguage = supportedLanguages.some(lang => lang.code === languageCode);
    
    if (!isValidLanguage) {
      return res.status(400).json({
        error: `Unsupported language: ${languageCode}`,
        code: 'INVALID_LANGUAGE',
        supportedLanguages: supportedLanguages.map(l => l.code)
      });
    }

    console.log(`Transcribing audio from COS: ${audioKey}`);

    // Download audio file from COS
    let audioBuffer: Buffer;
    let contentType: string;
    
    try {
      const result = await downloadObject(audioKey);
      audioBuffer = result.buffer;
      contentType = result.contentType || 'audio/wav';
    } catch (error) {
      console.error('Failed to download audio from COS:', error);
      return res.status(404).json({
        error: 'Audio file not found in storage',
        code: 'AUDIO_NOT_FOUND',
        audioKey
      });
    }

    // Validate content type
    const supportedFormats = getSupportedAudioFormats();
    if (!supportedFormats.includes(contentType)) {
      return res.status(400).json({
        error: `Unsupported audio format: ${contentType}`,
        code: 'UNSUPPORTED_FORMAT',
        supportedFormats
      });
    }

    // Transcribe audio
    console.log(`Starting transcription: ${audioBuffer.length} bytes, ${contentType}, ${languageCode}`);
    
    const transcription = await transcribeAudio(audioBuffer, {
      contentType,
      language: languageCode,
      speakerLabels: speakerLabels !== false,
      maxSpeakers: maxSpeakers || 5,
      timestamps: true,
      wordConfidence: true,
    });

    console.log(`Transcription complete: ${transcription.wordCount} words, ${transcription.speakers.length} speakers`);

    // Return results
    res.json({
      ok: true,
      transcription: {
        fullText: transcription.fullText,
        speakers: transcription.speakers,
        segments: transcription.segments,
        metadata: {
          language: transcription.language,
          duration: transcription.duration,
          wordCount: transcription.wordCount,
          speakerCount: transcription.speakers.length,
          segmentCount: transcription.segments.length,
          audioKey,
          meetingId: meetingId || null,
          transcribedAt: new Date().toISOString(),
        }
      }
    });
  } catch (error) {
    console.error('Transcribe route error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('credentials not configured')) {
        return res.status(503).json({
          error: 'Watson Speech to Text service not configured',
          code: 'SERVICE_NOT_CONFIGURED',
          message: 'Please configure WATSON_STT_APIKEY and WATSON_STT_URL in .env'
        });
      }
      
      if (error.message.includes('Transcription failed')) {
        return res.status(500).json({
          error: 'Transcription failed',
          code: 'TRANSCRIPTION_FAILED',
          message: error.message
        });
      }
    }
    
    next(error);
  }
});

/**
 * GET /transcribe/languages
 * Get list of supported languages
 */
r.get('/languages', (_req: Request, res: Response) => {
  const languages = getSupportedLanguages();
  res.json({
    ok: true,
    languages,
    count: languages.length
  });
});

/**
 * GET /transcribe/formats
 * Get list of supported audio formats
 */
r.get('/formats', (_req: Request, res: Response) => {
  const formats = getSupportedAudioFormats();
  res.json({
    ok: true,
    formats,
    count: formats.length
  });
});

export default r;

// Made with Bob
