import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import { IamAuthenticator } from 'ibm-watson/auth/index.js';
import { Readable } from 'stream';

// Initialize Watson Speech to Text client
let speechToText: SpeechToTextV1 | null = null;

function getSpeechToTextClient(): SpeechToTextV1 {
  if (!speechToText) {
    if (!process.env.WATSON_STT_APIKEY || !process.env.WATSON_STT_URL) {
      throw new Error('Watson Speech to Text credentials not configured. Please set WATSON_STT_APIKEY and WATSON_STT_URL in .env');
    }

    speechToText = new SpeechToTextV1({
      authenticator: new IamAuthenticator({
        apikey: process.env.WATSON_STT_APIKEY,
      }),
      serviceUrl: process.env.WATSON_STT_URL,
    });
  }
  return speechToText;
}

export interface TranscriptionOptions {
  contentType: string;
  speakerLabels?: boolean;
  maxSpeakers?: number;
  language?: string;
  timestamps?: boolean;
  wordConfidence?: boolean;
}

export interface Speaker {
  id: number;
  label: string;
  confidence: number;
}

export interface TranscriptSegment {
  speakerId: number | null;
  speakerLabel: string | null;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface TranscriptionResult {
  fullText: string;
  speakers: Speaker[];
  segments: TranscriptSegment[];
  language: string;
  duration: number;
  wordCount: number;
}

/**
 * Transcribe audio buffer using Watson Speech to Text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const client = getSpeechToTextClient();

  // Convert buffer to stream
  const audioStream = Readable.from(audioBuffer);

  // Determine model based on language
  const language = options.language || 'en-US';
  const model = `${language}_BroadbandModel`;

  console.log(`Transcribing audio with model: ${model}, speaker labels: ${options.speakerLabels}`);

  try {
    const params: any = {
      audio: audioStream,
      contentType: options.contentType,
      model: model,
      speakerLabels: options.speakerLabels || false,
      timestamps: options.timestamps !== false,
      wordConfidence: options.wordConfidence !== false,
      maxAlternatives: 1,
    };

    // Add speaker count if speaker labels are enabled
    if (options.speakerLabels && options.maxSpeakers) {
      params.speakerLabelsMaxSpeakers = options.maxSpeakers;
    }

    const response = await client.recognize(params);
    
    return parseTranscriptionResponse(response.result, language);
  } catch (error) {
    console.error('Watson STT transcription error:', error);
    throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse Watson STT response into structured format
 */
function parseTranscriptionResponse(result: any, language: string): TranscriptionResult {
  const speakers: Speaker[] = [];
  const segments: TranscriptSegment[] = [];
  let fullText = '';
  let totalDuration = 0;
  let wordCount = 0;

  // Extract speaker labels if available
  if (result.speaker_labels && result.speaker_labels.length > 0) {
    const speakerMap = new Map<number, { confidence: number; count: number }>();
    
    result.speaker_labels.forEach((label: any) => {
      const speakerId = label.speaker;
      if (!speakerMap.has(speakerId)) {
        speakerMap.set(speakerId, { confidence: 0, count: 0 });
      }
      const speaker = speakerMap.get(speakerId)!;
      speaker.confidence += label.confidence;
      speaker.count += 1;
    });

    // Create speaker list with average confidence
    speakerMap.forEach((data, id) => {
      speakers.push({
        id,
        label: `Speaker ${id}`,
        confidence: data.confidence / data.count,
      });
    });

    speakers.sort((a, b) => a.id - b.id);
  }

  // Extract transcript segments
  if (result.results && result.results.length > 0) {
    result.results.forEach((resultItem: any) => {
      if (resultItem.alternatives && resultItem.alternatives.length > 0) {
        const alternative = resultItem.alternatives[0];
        const transcript = alternative.transcript.trim();
        
        if (transcript) {
          fullText += (fullText ? ' ' : '') + transcript;
          wordCount += transcript.split(/\s+/).length;

          // Get timing information
          let startTime = 0;
          let endTime = 0;
          let confidence = alternative.confidence || 0;

          if (alternative.timestamps && alternative.timestamps.length > 0) {
            startTime = alternative.timestamps[0][1];
            endTime = alternative.timestamps[alternative.timestamps.length - 1][2];
            totalDuration = Math.max(totalDuration, endTime);
          }

          // Match with speaker labels
          let speakerId: number | null = null;
          let speakerLabel: string | null = null;

          if (result.speaker_labels) {
            // Find speaker label that overlaps with this segment
            const matchingLabel = result.speaker_labels.find((label: any) => {
              return label.from <= startTime && label.to >= startTime;
            });

            if (matchingLabel) {
              speakerId = matchingLabel.speaker;
              speakerLabel = `Speaker ${speakerId}`;
            }
          }

          segments.push({
            speakerId,
            speakerLabel,
            text: transcript,
            startTime,
            endTime,
            confidence,
          });
        }
      }
    });
  }

  return {
    fullText,
    speakers,
    segments,
    language,
    duration: totalDuration,
    wordCount,
  };
}

/**
 * Get supported audio formats
 */
export function getSupportedAudioFormats(): string[] {
  return [
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/flac',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/x-m4a',
  ];
}

/**
 * Get supported languages
 */
export function getSupportedLanguages(): Array<{ code: string; name: string; model: string }> {
  return [
    { code: 'en-US', name: 'English (US)', model: 'en-US_BroadbandModel' },
    { code: 'en-GB', name: 'English (UK)', model: 'en-GB_BroadbandModel' },
    { code: 'es-ES', name: 'Spanish (Spain)', model: 'es-ES_BroadbandModel' },
    { code: 'es-LA', name: 'Spanish (Latin America)', model: 'es-LA_BroadbandModel' },
    { code: 'fr-FR', name: 'French', model: 'fr-FR_BroadbandModel' },
    { code: 'de-DE', name: 'German', model: 'de-DE_BroadbandModel' },
    { code: 'ja-JP', name: 'Japanese', model: 'ja-JP_BroadbandModel' },
    { code: 'ko-KR', name: 'Korean', model: 'ko-KR_BroadbandModel' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', model: 'pt-BR_BroadbandModel' },
    { code: 'zh-CN', name: 'Chinese (Mandarin)', model: 'zh-CN_BroadbandModel' },
  ];
}

/**
 * Test Watson STT connection
 */
export async function testSttConnection(): Promise<boolean> {
  try {
    const client = getSpeechToTextClient();
    await client.listModels();
    return true;
  } catch (error) {
    console.error('Watson STT connection test failed:', error);
    return false;
  }
}

// Made with Bob
