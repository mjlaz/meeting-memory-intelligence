#!/usr/bin/env node

/**
 * watsonx.ai API Credentials Test Script
 *
 * This script verifies that watsonx.ai API credentials are properly configured
 * and can successfully connect to the service.
 */

import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

/**
 * Check if required environment variables are set
 */
function checkEnvironmentVariables(): boolean {
  logSection('Step 1: Checking Environment Variables');
  
  const requiredVars = [
    'WATSONX_AI_APIKEY',
    'WATSONX_AI_SERVICE_URL',
    'WATSONX_AI_PROJECT_ID',
    'WATSONX_MODEL_ID',
    'WATSONX_API_VERSION',
  ];

  let allSet = true;

  for (const varName of requiredVars) {
    const value = process.env[varName];
    
    if (!value || value.startsWith('<') || value.trim() === '') {
      logError(`${varName} is not set or contains placeholder value`);
      allSet = false;
    } else {
      // Mask sensitive values
      const displayValue = varName.includes('APIKEY') 
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
        : value;
      logSuccess(`${varName}: ${displayValue}`);
    }
  }

  if (!allSet) {
    logWarning('\nPlease configure the missing environment variables in api/.env');
    logInfo('Refer to api/.env.example for the required format');
  }

  return allSet;
}

/**
 * Test watsonx.ai API connection
 */
async function testWatsonXConnection(): Promise<boolean> {
  logSection('Step 2: Testing watsonx.ai API Connection');
  
  try {
    // Dynamically import the service to ensure env vars are loaded
    const { wxExtractText } = await import('./src/services/wx.js');
    
    logInfo('Sending test request to watsonx.ai...');
    logInfo(`Model: ${process.env.WATSONX_MODEL_ID}`);
    logInfo(`Service URL: ${process.env.WATSONX_AI_SERVICE_URL}`);
    
    const testPrompt = 'You are a helpful assistant. Respond with a simple JSON object containing a success message.';
    const testInput = 'Please confirm the API is working by returning: {"status": "success", "message": "API connection verified"}';
    
    const startTime = Date.now();
    const result = await wxExtractText(testInput, testPrompt, {
      maxTokens: 100,
      temperature: 0.1,
      retries: 1,
    });
    const duration = Date.now() - startTime;
    
    logSuccess(`API call successful! (${duration}ms)`);
    logInfo('\nResponse from watsonx.ai:');
    console.log(colors.cyan + '─'.repeat(60) + colors.reset);
    
    // Try to parse and pretty-print the response
    if (result && result.results && result.results[0]) {
      const generatedText = result.results[0].generated_text;
      console.log(generatedText);
      
      // Show token usage if available
      if (result.results[0].generated_token_count) {
        logInfo(`\nTokens generated: ${result.results[0].generated_token_count}`);
      }
      if (result.results[0].input_token_count) {
        logInfo(`Input tokens: ${result.results[0].input_token_count}`);
      }
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    
    console.log(colors.cyan + '─'.repeat(60) + colors.reset);
    
    return true;
  } catch (error) {
    logError('API connection failed!');
    
    if (error instanceof Error) {
      logError(`Error: ${error.message}`);
      
      // Provide helpful troubleshooting tips
      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        logWarning('\nTroubleshooting tips:');
        logInfo('1. Verify your WATSONX_AI_APIKEY is correct');
        logInfo('2. Check that your API key has not expired');
        logInfo('3. Ensure your IBM Cloud account is active');
      } else if (error.message.includes('project')) {
        logWarning('\nTroubleshooting tips:');
        logInfo('1. Verify your WATSONX_AI_PROJECT_ID is correct');
        logInfo('2. Ensure the project exists in your watsonx.ai account');
        logInfo('3. Check that you have access to the project');
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        logWarning('\nTroubleshooting tips:');
        logInfo('1. You may have exceeded your API quota');
        logInfo('2. Wait a few minutes and try again');
        logInfo('3. Check your watsonx.ai plan limits');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
        logWarning('\nTroubleshooting tips:');
        logInfo('1. Check your internet connection');
        logInfo('2. Verify the WATSONX_AI_SERVICE_URL is correct');
        logInfo('3. Ensure you can access IBM Cloud services');
      }
      
      // Show stack trace in development
      if (process.env.NODE_ENV === 'development') {
        console.log('\n' + colors.yellow + 'Stack trace:' + colors.reset);
        console.log(error.stack);
      }
    } else {
      logError(`Unknown error: ${String(error)}`);
    }
    
    return false;
  }
}

/**
 * Main test execution
 */
async function main() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════╗', colors.bright + colors.cyan);
  log('║        watsonx.ai API Credentials Test Script             ║', colors.bright + colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.bright + colors.cyan);
  
  let exitCode = 0;
  
  try {
    // Step 1: Check environment variables
    const envVarsOk = checkEnvironmentVariables();
    
    if (!envVarsOk) {
      logSection('Test Result');
      logError('Environment variables are not properly configured');
      logInfo('Please update api/.env with your watsonx.ai credentials');
      exitCode = 1;
    } else {
      // Step 2: Test API connection
      const connectionOk = await testWatsonXConnection();
      
      // Final result
      logSection('Test Result');
      
      if (connectionOk) {
        logSuccess('All tests passed! ✓');
        logSuccess('watsonx.ai API credentials are working correctly');
        exitCode = 0;
      } else {
        logError('API connection test failed ✗');
        logInfo('Please check the error messages above for troubleshooting tips');
        exitCode = 1;
      }
    }
  } catch (error) {
    logSection('Test Result');
    logError('Unexpected error occurred during testing');
    console.error(error);
    exitCode = 1;
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  process.exit(exitCode);
}

// Run the test
main();

// Made with Bob
