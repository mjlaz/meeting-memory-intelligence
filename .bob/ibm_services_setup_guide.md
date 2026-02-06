# IBM Services Setup Guide

**Version:** 1.0.0  
**Date:** 2026-02-03  
**For:** Meeting Memory Intelligence Engine

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [IBM Cloud Account Setup](#ibm-cloud-account-setup)
4. [IBM Cloud Object Storage (COS)](#ibm-cloud-object-storage-cos)
5. [IBM Watson Speech to Text](#ibm-watson-speech-to-text)
6. [IBM watsonx.ai](#ibm-watsonxai)
7. [Environment Configuration](#environment-configuration)
8. [Testing Connections](#testing-connections)
9. [Troubleshooting](#troubleshooting)
10. [Cost Optimization](#cost-optimization)

---

## Overview

The Meeting Memory Intelligence Engine integrates with three core IBM Cloud services:

1. **IBM Cloud Object Storage (COS)** - Store audio files and documents
2. **IBM Watson Speech to Text** - Transcribe audio with speaker identification
3. **IBM watsonx.ai** - Extract structured facts using Granite models

This guide provides step-by-step instructions for setting up each service.

---

## Prerequisites

### Required Tools

- IBM Cloud CLI
- Node.js v24+
- Git
- Text editor

### Required Accounts

- IBM Cloud account (free tier available)
- IBM Cloud API key
- Credit card (for paid services, though free tiers exist)

### Estimated Setup Time

- IBM Cloud account: 10 minutes
- COS setup: 15 minutes
- Watson STT setup: 10 minutes
- watsonx.ai setup: 15 minutes
- **Total: ~50 minutes**

---

## IBM Cloud Account Setup

### Step 1: Create IBM Cloud Account

1. Go to https://cloud.ibm.com/registration
2. Fill in your details:
   - Email address
   - Password
   - Country/Region
   - Accept terms and conditions
3. Verify your email address
4. Complete account verification

### Step 2: Create API Key

1. Log in to IBM Cloud Console
2. Navigate to **Manage** → **Access (IAM)**
3. Click **API keys** in the left sidebar
4. Click **Create an IBM Cloud API key**
5. Enter a name: `meeting-memory-api-key`
6. Add description: `API key for Meeting Memory Intelligence Engine`
7. Click **Create**
8. **IMPORTANT:** Copy and save the API key immediately (you won't see it again)
9. Store securely in password manager

### Step 3: Create Resource Group

1. Navigate to **Manage** → **Account** → **Resource groups**
2. Click **Create**
3. Name: `meeting-memory-resources`
4. Click **Create**

---

## IBM Cloud Object Storage (COS)

### Overview

COS stores:
- Audio files (uploaded meetings)
- Transcript files
- Generated documents
- Temporary processing files

### Step 1: Create COS Instance

1. Go to IBM Cloud Catalog: https://cloud.ibm.com/catalog
2. Search for "Object Storage"
3. Click **Object Storage**
4. Configure:
   - **Service name:** `meeting-memory-cos`
   - **Resource group:** `meeting-memory-resources`
   - **Plan:** Standard (pay-as-you-go) or Lite (free tier)
   - **Location:** Choose closest region (e.g., `us-south`)
5. Click **Create**
6. Wait for provisioning (1-2 minutes)

### Step 2: Create Bucket

1. Open your COS instance
2. Click **Create bucket**
3. Choose **Customize your bucket**
4. Configure:
   - **Bucket name:** `meeting-memory-uploads` (must be globally unique)
   - **Resiliency:** Regional
   - **Location:** Same as instance (e.g., `us-south`)
   - **Storage class:** Standard
   - **Encryption:** IBM-managed
5. Click **Create bucket**

### Step 3: Get Service Credentials

1. In COS instance, click **Service credentials**
2. Click **New credential**
3. Configure:
   - **Name:** `meeting-memory-cos-credentials`
   - **Role:** Writer
   - **Include HMAC Credential:** Yes (check this box)
4. Click **Add**
5. Click **View credentials** (expand the credential)
6. Copy the following values:

```json
{
  "apikey": "YOUR_COS_API_KEY",
  "endpoints": "https://control.cloud-object-storage.cloud.ibm.com/v2/endpoints",
  "iam_apikey_description": "...",
  "iam_apikey_name": "...",
  "iam_role_crn": "...",
  "iam_serviceid_crn": "...",
  "resource_instance_id": "crn:v1:bluemix:public:cloud-object-storage:global:a/...::"
}
```

### Step 4: Get Endpoint URL

1. Click **Endpoints** in left sidebar
2. Find your region (e.g., `us-south`)
3. Copy the **Public** endpoint
4. Example: `https://s3.us-south.cloud-object-storage.appdomain.cloud`

### Environment Variables for COS

```bash
COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud
COS_API_KEY=<your-cos-api-key>
COS_INSTANCE_CRN=<your-resource-instance-id>
COS_BUCKET=meeting-memory-uploads
```

---

## IBM Watson Speech to Text

### Overview

Watson STT provides:
- Audio transcription
- Speaker diarization (identification)
- Multi-language support (10 languages)
- Confidence scores
- Timestamps

### Step 1: Create Watson STT Instance

1. Go to IBM Cloud Catalog
2. Search for "Speech to Text"
3. Click **Speech to Text**
4. Configure:
   - **Service name:** `meeting-memory-stt`
   - **Resource group:** `meeting-memory-resources`
   - **Plan:** Lite (free tier, 500 min/month) or Standard
   - **Location:** Choose closest region (e.g., `Dallas`)
5. Click **Create**
6. Wait for provisioning

### Step 2: Get Service Credentials

1. Open your Watson STT instance
2. Click **Service credentials**
3. Click **New credential**
4. Configure:
   - **Name:** `meeting-memory-stt-credentials`
   - **Role:** Manager
5. Click **Add**
6. Click **View credentials**
7. Copy the following:

```json
{
  "apikey": "YOUR_WATSON_STT_API_KEY",
  "url": "https://api.us-south.speech-to-text.watson.cloud.ibm.com/instances/..."
}
```

### Step 3: Test Watson STT

Using IBM Cloud CLI:

```bash
# Install IBM Cloud CLI plugin
ibmcloud plugin install speech-to-text

# Test connection
curl -X POST -u "apikey:YOUR_WATSON_STT_API_KEY" \
  --header "Content-Type: audio/flac" \
  --data-binary @audio-file.flac \
  "YOUR_WATSON_STT_URL/v1/recognize?model=en-US_BroadbandModel"
```

### Supported Languages

- English (US): `en-US_BroadbandModel`
- English (UK): `en-GB_BroadbandModel`
- Spanish: `es-ES_BroadbandModel`
- French: `fr-FR_BroadbandModel`
- German: `de-DE_BroadbandModel`
- Portuguese: `pt-BR_BroadbandModel`
- Japanese: `ja-JP_BroadbandModel`
- Korean: `ko-KR_BroadbandModel`
- Arabic: `ar-MS_BroadbandModel`
- Mandarin: `zh-CN_BroadbandModel`

### Supported Audio Formats

- WAV (audio/wav)
- MP3 (audio/mp3)
- FLAC (audio/flac)
- OGG (audio/ogg)
- WebM (audio/webm)
- MPEG (audio/mpeg)
- MP4 (audio/mp4)
- Mulaw (audio/mulaw)

### Environment Variables for Watson STT

```bash
WATSON_STT_APIKEY=<your-watson-stt-api-key>
WATSON_STT_URL=<your-watson-stt-url>
```

---

## IBM watsonx.ai

### Overview

watsonx.ai provides:
- Granite model access (ibm/granite-3-8b-instruct)
- Structured fact extraction
- JSON output generation
- Prompt engineering capabilities

### Step 1: Access watsonx.ai

1. Go to https://dataplatform.cloud.ibm.com/wx/home
2. Log in with your IBM Cloud account
3. If first time, accept terms and conditions

### Step 2: Create Project

1. Click **Projects** in left sidebar
2. Click **New project**
3. Choose **Create an empty project**
4. Configure:
   - **Name:** `meeting-memory-project`
   - **Description:** `AI-powered meeting intelligence`
   - **Storage:** Select your COS instance
5. Click **Create**

### Step 3: Get Project ID

1. Open your project
2. Click **Manage** tab
3. Click **General**
4. Copy **Project ID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Step 4: Get API Key

Use the same IBM Cloud API key created earlier, or create a new one:

1. Navigate to **Manage** → **Access (IAM)**
2. Click **API keys**
3. Use existing or create new: `watsonx-api-key`

### Step 5: Get Service URL

Default watsonx.ai URL:
```
https://us-south.ml.cloud.ibm.com
```

Or find your region-specific URL:
1. Go to watsonx.ai documentation
2. Find your region's endpoint
3. Common endpoints:
   - US South: `https://us-south.ml.cloud.ibm.com`
   - EU Germany: `https://eu-de.ml.cloud.ibm.com`
   - Japan Tokyo: `https://jp-tok.ml.cloud.ibm.com`

### Step 6: Test watsonx.ai Connection

Using curl:

```bash
curl -X POST \
  "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-03-19" \
  -H "Authorization: Bearer YOUR_IAM_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model_id": "ibm/granite-3-8b-instruct",
    "input": "What is AI?",
    "parameters": {
      "max_new_tokens": 100
    },
    "project_id": "YOUR_PROJECT_ID"
  }'
```

### Granite Model Configuration

**Model ID:** `ibm/granite-3-8b-instruct`

**Recommended Parameters:**
```json
{
  "max_new_tokens": 800,
  "temperature": 0.2,
  "top_p": 0.95,
  "repetition_penalty": 1.0
}
```

### Environment Variables for watsonx.ai

```bash
WATSONX_API_KEY=<your-ibm-cloud-api-key>
WATSONX_PROJECT_ID=<your-project-id>
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL=ibm/granite-3-8b-instruct
WATSONX_API_VERSION=2024-03-19
```

---

## Environment Configuration

### Complete .env File

Create `api/.env` with all credentials:

```bash
# Server Configuration
PORT=8080
NODE_ENV=development

# IBM Cloud Object Storage
COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud
COS_API_KEY=your_cos_api_key_here
COS_INSTANCE_CRN=crn:v1:bluemix:public:cloud-object-storage:global:a/...
COS_BUCKET=meeting-memory-uploads

# IBM Watson Speech to Text
WATSON_STT_APIKEY=your_watson_stt_api_key_here
WATSON_STT_URL=https://api.us-south.speech-to-text.watson.cloud.ibm.com/instances/...

# IBM watsonx.ai
WATSONX_API_KEY=your_watsonx_api_key_here
WATSONX_PROJECT_ID=your_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL=ibm/granite-3-8b-instruct
WATSONX_API_VERSION=2024-03-19
```

### Security Best Practices

1. **Never commit .env to git**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use different credentials for dev/prod**
   - Development: `.env.development`
   - Production: `.env.production`

3. **Rotate API keys regularly**
   - Every 90 days minimum
   - Immediately if compromised

4. **Use IBM Cloud Secrets Manager (production)**
   - Centralized secret management
   - Automatic rotation
   - Audit logging

5. **Limit API key permissions**
   - Use service-specific keys
   - Assign minimum required roles
   - Monitor usage

---

## Testing Connections

### Test Script

Create `api/test-connections.ts`:

```typescript
import { testCOSConnection } from './src/services/cos.js';
import { testWatsonSTTConnection } from './src/services/stt.js';
import { testWatsonXConnection } from './src/services/wx.js';

async function testAllConnections() {
  console.log('Testing IBM service connections...\n');
  
  // Test COS
  console.log('1. Testing IBM Cloud Object Storage...');
  try {
    await testCOSConnection();
    console.log('✅ COS connection successful\n');
  } catch (error) {
    console.error('❌ COS connection failed:', error.message, '\n');
  }
  
  // Test Watson STT
  console.log('2. Testing Watson Speech to Text...');
  try {
    await testWatsonSTTConnection();
    console.log('✅ Watson STT connection successful\n');
  } catch (error) {
    console.error('❌ Watson STT connection failed:', error.message, '\n');
  }
  
  // Test watsonx.ai
  console.log('3. Testing watsonx.ai...');
  try {
    await testWatsonXConnection();
    console.log('✅ watsonx.ai connection successful\n');
  } catch (error) {
    console.error('❌ watsonx.ai connection failed:', error.message, '\n');
  }
  
  console.log('Connection testing complete!');
}

testAllConnections();
```

Run tests:
```bash
cd api
npm run test:connections
```

### Manual Testing

**Test COS:**
```bash
curl -X GET \
  "https://s3.us-south.cloud-object-storage.appdomain.cloud/meeting-memory-uploads" \
  -H "Authorization: Bearer YOUR_IAM_TOKEN"
```

**Test Watson STT:**
```bash
curl -X GET \
  "YOUR_WATSON_STT_URL/v1/models" \
  -u "apikey:YOUR_WATSON_STT_API_KEY"
```

**Test watsonx.ai:**
```bash
# Get IAM token first
curl -X POST \
  "https://iam.cloud.ibm.com/identity/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=YOUR_API_KEY"

# Test generation
curl -X POST \
  "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-03-19" \
  -H "Authorization: Bearer YOUR_IAM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "ibm/granite-3-8b-instruct",
    "input": "Hello",
    "project_id": "YOUR_PROJECT_ID"
  }'
```

---

## Troubleshooting

### Common Issues

#### 1. COS Connection Failed

**Error:** `Access Denied` or `InvalidAccessKeyId`

**Solutions:**
- Verify COS_API_KEY is correct
- Check COS_INSTANCE_CRN format
- Ensure bucket name is correct
- Verify IAM permissions (Writer role)

**Check:**
```bash
# List buckets
ibmcloud cos buckets --ibm-service-instance-id YOUR_INSTANCE_CRN
```

#### 2. Watson STT Authentication Failed

**Error:** `401 Unauthorized`

**Solutions:**
- Verify WATSON_STT_APIKEY is correct
- Check WATSON_STT_URL format
- Ensure service is provisioned
- Check API key hasn't expired

**Check:**
```bash
# Test authentication
curl -u "apikey:YOUR_WATSON_STT_API_KEY" \
  "YOUR_WATSON_STT_URL/v1/models"
```

#### 3. watsonx.ai Project Not Found

**Error:** `Project not found` or `Invalid project_id`

**Solutions:**
- Verify WATSONX_PROJECT_ID is correct (UUID format)
- Ensure project exists in watsonx.ai
- Check API key has access to project
- Verify project is in same region

**Check:**
```bash
# List projects (requires IBM Cloud CLI)
ibmcloud resource service-instances --service-name watsonx
```

#### 4. Rate Limiting

**Error:** `429 Too Many Requests`

**Solutions:**
- Implement exponential backoff (already in code)
- Upgrade to paid tier for higher limits
- Reduce request frequency
- Use caching where possible

**Limits:**
- Watson STT Lite: 500 minutes/month
- watsonx.ai: Varies by plan
- COS: Varies by plan

#### 5. Model Not Available

**Error:** `Model not found` or `Model not accessible`

**Solutions:**
- Verify model ID: `ibm/granite-3-8b-instruct`
- Check model availability in your region
- Ensure project has model access
- Try alternative model if needed

---

## Cost Optimization

### Free Tier Limits

**IBM Cloud Object Storage (Lite):**
- 25 GB storage
- 2,000 Class A requests/month
- 20,000 Class B requests/month
- **Cost:** Free

**Watson Speech to Text (Lite):**
- 500 minutes/month
- Standard models only
- **Cost:** Free

**watsonx.ai:**
- Pay-as-you-go pricing
- ~$0.0005 per 1K tokens
- **Estimated:** $5-20/month for moderate use

### Cost Reduction Strategies

1. **Use Lite Plans for Development**
   - Switch to Standard for production
   - Monitor usage closely

2. **Optimize Audio Files**
   - Compress audio before upload
   - Use efficient formats (FLAC, OGG)
   - Remove silence periods

3. **Cache Transcriptions**
   - Store transcripts in database
   - Avoid re-transcribing same audio
   - Implement deduplication

4. **Batch Processing**
   - Process multiple files together
   - Reduce API call overhead
   - Use async processing

5. **Monitor Usage**
   - Set up billing alerts
   - Review usage monthly
   - Identify optimization opportunities

### Estimated Monthly Costs

**Light Usage (10 meetings/month):**
- COS: Free (Lite tier)
- Watson STT: Free (Lite tier, <500 min)
- watsonx.ai: $5-10
- **Total: $5-10/month**

**Moderate Usage (50 meetings/month):**
- COS: $1-2
- Watson STT: $10-20 (Standard tier)
- watsonx.ai: $15-25
- **Total: $26-47/month**

**Heavy Usage (200 meetings/month):**
- COS: $5-10
- Watson STT: $40-80
- watsonx.ai: $50-100
- **Total: $95-190/month**

---

## Next Steps

After completing IBM services setup:

1. ✅ Verify all credentials in `.env`
2. ✅ Run connection tests
3. ✅ Test with sample audio file
4. ✅ Monitor usage in IBM Cloud dashboard
5. ✅ Set up billing alerts
6. ✅ Document any custom configurations
7. ✅ Train team on IBM Cloud console

## Support Resources

- **IBM Cloud Documentation:** https://cloud.ibm.com/docs
- **Watson STT Docs:** https://cloud.ibm.com/docs/speech-to-text
- **watsonx.ai Docs:** https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-overview.html
- **IBM Cloud Support:** https://cloud.ibm.com/unifiedsupport/supportcenter
- **Community Forum:** https://community.ibm.com/community/user/watsonai/home

## Conclusion

You now have complete IBM Cloud services configured for the Meeting Memory Intelligence Engine. All three services (COS, Watson STT, watsonx.ai) are ready for audio transcription, fact extraction, and document generation.

**Setup Checklist:**
- ✅ IBM Cloud account created
- ✅ API keys generated
- ✅ COS instance and bucket created
- ✅ Watson STT instance created
- ✅ watsonx.ai project created
- ✅ Environment variables configured
- ✅ Connections tested
- ✅ Cost monitoring enabled

**Ready for Production!**