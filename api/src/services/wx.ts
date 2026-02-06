import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import { IamAuthenticator } from 'ibm-cloud-sdk-core';

// Initialize watsonx.ai client with proper IAM authentication
const watsonxAIService = WatsonXAI.newInstance({
  version: process.env.WATSONX_API_VERSION || '2024-05-31',
  serviceUrl: process.env.WATSONX_AI_SERVICE_URL || 'https://us-south.ml.cloud.ibm.com',
  authenticator: new IamAuthenticator({
    apikey: process.env.WATSONX_AI_APIKEY!,
  }),
});

// Enhanced parameters for better extraction
export interface ExtractionOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  repetitionPenalty?: number;
  retries?: number;
}

const DEFAULT_OPTIONS: Required<ExtractionOptions> = {
  maxTokens: 800,
  temperature: 0.2,
  topP: 0.95,
  repetitionPenalty: 1.1,
  retries: 3,
};

/**
 * Extract structured information from text using watsonx.ai
 * Includes retry logic and enhanced error handling
 */
export async function wxExtractText(
  input: string,
  systemPrompt: string,
  options: ExtractionOptions = {}
): Promise<any> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      const textGenParams = {
        input: `${systemPrompt}

FULL TRANSCRIPT:
${input}`,
        modelId: process.env.WATSONX_MODEL_ID || 'ibm/granite-3-8b-instruct',
        projectId: process.env.WATSONX_AI_PROJECT_ID!,
        parameters: {
          max_new_tokens: opts.maxTokens,
          temperature: opts.temperature,
          top_p: opts.topP,
          repetition_penalty: opts.repetitionPenalty,
          stop_sequences: ['\n\n\n'], // Stop on excessive newlines
        },
      };

      const response = await watsonxAIService.generateText(textGenParams);

      // Validate response
      if (!response || !response.result || !response.result.results || response.result.results.length === 0) {
        throw new Error('Empty response from watsonx.ai');
      }

      // Extract generated text from response
      const generatedText = response.result.results[0].generated_text;
      return { generated_text: generatedText };
    } catch (error) {
      lastError = error as Error;
      console.error(`watsonx.ai extraction attempt ${attempt}/${opts.retries} failed:`, error);

      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.message.includes('authentication') || error.message.includes('unauthorized') || error.message.includes('401')) {
          throw new Error('watsonx.ai authentication failed. Check API key and project ID.');
        }
        if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('watsonx.ai quota exceeded. Please try again later.');
        }
        if (error.message.includes('404') || error.message.includes('not found')) {
          throw new Error('watsonx.ai project or model not found. Check project ID and model ID.');
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < opts.retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`watsonx.ai extraction failed after ${opts.retries} attempts: ${lastError?.message}`);
}

/**
 * Extract facts with fallback to simpler prompt if needed
 */
export async function wxExtractWithFallback(
  input: string,
  primaryPrompt: string,
  fallbackPrompt?: string,
  options: ExtractionOptions = {}
): Promise<any> {
  try {
    return await wxExtractText(input, primaryPrompt, options);
  } catch (error) {
    if (fallbackPrompt) {
      console.warn('Primary extraction failed, trying fallback prompt');
      return await wxExtractText(input, fallbackPrompt, { ...options, retries: 2 });
    }
    throw error;
  }
}

/**
 * Test connection to watsonx.ai
 */
export async function testWatsonXConnection(): Promise<boolean> {
  try {
    const testPrompt = 'Return only the word "OK" in JSON format: {"status": "OK"}';
    const result = await wxExtractText('Test', testPrompt, { retries: 1, maxTokens: 50 });
    return result !== null;
  } catch (error) {
    console.error('watsonx.ai connection test failed:', error);
    return false;
  }
}

// Made with Bob
