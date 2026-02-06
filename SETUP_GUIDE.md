# Meeting Memory Intelligence Engine - Setup Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup Instructions](#detailed-setup-instructions)
- [IBM Cloud Services Setup](#ibm-cloud-services-setup)
- [Environment Configuration](#environment-configuration)
- [Database Initialization](#database-initialization)
- [Running the Application](#running-the-application)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Development Tools](#development-tools)

## Prerequisites

### Required Software

1. **Node.js** (version 20 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation:
     ```bash
     node --version  # Should show v20.x.x or higher
     npm --version   # Should show 10.x.x or higher
     ```

2. **Git** (for cloning the repository)
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify installation:
     ```bash
     git --version
     ```

3. **Text Editor or IDE**
   - Recommended: [Visual Studio Code](https://code.visualstudio.com/)
   - Alternatives: WebStorm, Sublime Text, Vim

### IBM Cloud Account

You'll need an IBM Cloud account with access to:
- **IBM Cloud Object Storage (COS)** - For storing meeting artifacts
- **IBM watsonx.ai** - For AI-powered fact extraction
- **IBM Watson Speech-to-Text** (optional) - For audio transcription

**Sign up**: [cloud.ibm.com](https://cloud.ibm.com/)

### System Requirements

- **Operating System**: macOS, Linux, or Windows 10/11
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: 500MB for application + space for meeting artifacts
- **Network**: Internet connection for IBM Cloud services

## Quick Start

For experienced developers who want to get started quickly:

```bash
# 1. Clone the repository
git clone <repository-url>
cd meeting-memory-intel-regenerated

# 2. Install dependencies
cd api
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your IBM Cloud credentials

# 4. Run the application
npm run dev

# 5. Open browser
open http://localhost:8080
```

## Detailed Setup Instructions

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd meeting-memory-intel-regenerated

# Verify the structure
ls -la
# You should see: api/, web/, README.md, etc.
```

### Step 2: Install Dependencies

```bash
# Navigate to the API directory
cd api

# Install all dependencies
npm install

# This will install:
# - Express.js and TypeScript
# - IBM Cloud SDKs (watsonx.ai, COS, Watson)
# - Database (better-sqlite3)
# - Validation (Zod)
# - Logging (Pino)
# - And other dependencies
```

**Expected output:**
```
added 150 packages, and audited 151 packages in 15s
```

### Step 3: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Open the file in your editor
nano .env
# or
code .env
```

The `.env` file contains all configuration variables. See [Environment Configuration](#environment-configuration) section for detailed setup.

### Step 4: Verify Installation

```bash
# Check if TypeScript is working
npx tsc --version

# Check if the build works
npm run build

# You should see a 'dist' directory created
ls -la dist/
```

## IBM Cloud Services Setup

### 1. IBM Cloud Object Storage (COS)

#### Create COS Instance

1. Log in to [IBM Cloud Console](https://cloud.ibm.com/)
2. Navigate to **Catalog** → **Storage** → **Object Storage**
3. Click **Create**
4. Choose a plan (Lite plan available for testing)
5. Name your instance (e.g., "meeting-intel-storage")
6. Click **Create**

#### Create a Bucket

1. Open your COS instance
2. Click **Create bucket**
3. Choose **Customize your bucket**
4. Configure:
   - **Bucket name**: `meeting-intel-uploads` (must be globally unique)
   - **Resiliency**: Regional
   - **Location**: Choose nearest region (e.g., us-south)
   - **Storage class**: Standard
5. Click **Create bucket**

#### Get Credentials

1. In your COS instance, go to **Service credentials**
2. Click **New credential**
3. Name: "meeting-intel-api-key"
4. Role: **Writer**
5. Click **Add**
6. Click **View credentials** and note:
   - `apikey` → Use for `COS_API_KEY_ID`
   - `resource_instance_id` → Use for `COS_INSTANCE_CRN`
   - `endpoints` → Find your regional endpoint for `COS_ENDPOINT`

**Example endpoint format:**
```
https://s3.us-south.cloud-object-storage.appdomain.cloud
```

### 2. IBM watsonx.ai

#### Create watsonx.ai Project

1. Navigate to [watsonx.ai](https://dataplatform.cloud.ibm.com/wx/home)
2. Click **Create project**
3. Choose **Create an empty project**
4. Name: "Meeting Intelligence"
5. Click **Create**
6. Note your **Project ID** (found in project settings)

#### Get API Credentials

1. Go to **IBM Cloud Console** → **Manage** → **Access (IAM)**
2. Click **API keys** → **Create**
3. Name: "watsonx-meeting-intel"
4. Click **Create**
5. **Copy and save the API key** (you won't see it again!)
6. Use this for `WATSONX_AI_APIKEY`

#### Get Service URL

1. In your watsonx.ai project, go to **Manage** → **Services and integrations**
2. Find **Watson Machine Learning**
3. Note the service URL (e.g., `https://us-south.ml.cloud.ibm.com`)
4. Use this for `WATSONX_AI_SERVICE_URL`

### 3. IBM Watson Speech-to-Text (Optional)

**Status**: Coming soon - placeholder implementation ready

1. Navigate to **Catalog** → **AI / Machine Learning** → **Speech to Text**
2. Click **Create**
3. Choose a plan (Lite plan available)
4. Get credentials from **Service credentials**
5. Note:
   - `apikey` → Use for `WATSON_STT_APIKEY`
   - `url` → Use for `WATSON_STT_URL`

## Environment Configuration

### Complete .env File Setup

Open your `.env` file and configure the following sections:

#### 1. IBM Cloud Object Storage

```bash
# IBM Cloud Object Storage (COS)
COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud
COS_API_KEY_ID=your-ibm-cloud-apikey-here
COS_INSTANCE_CRN=crn:v1:bluemix:public:cloud-object-storage:global:a/...
COS_BUCKET=meeting-intel-uploads
```

**How to get these values:**
- `COS_ENDPOINT`: From COS instance → Configuration → Endpoints → Regional
- `COS_API_KEY_ID`: From Service credentials → apikey
- `COS_INSTANCE_CRN`: From Service credentials → resource_instance_id
- `COS_BUCKET`: The bucket name you created

#### 2. IBM watsonx.ai

```bash
# IBM watsonx.ai
WATSONX_AI_AUTH_TYPE=iam
WATSONX_AI_APIKEY=your-watsonx-apikey-here
WATSONX_AI_SERVICE_URL=https://us-south.ml.cloud.ibm.com
WATSONX_AI_PROJECT_ID=your-project-id-here
WATSONX_MODEL_ID=ibm/granite-3-8b-instruct
WATSONX_API_VERSION=2025-02-11
```

**How to get these values:**
- `WATSONX_AI_APIKEY`: From IBM Cloud IAM → API keys
- `WATSONX_AI_SERVICE_URL`: From watsonx.ai project → Services
- `WATSONX_AI_PROJECT_ID`: From watsonx.ai project → Settings
- `WATSONX_MODEL_ID`: Use default or choose from available models
- `WATSONX_API_VERSION`: Use the latest version (check documentation)

#### 3. Application Settings

```bash
# Application Settings
PORT=8080
NODE_ENV=development
LOG_LEVEL=info
```

**Configuration options:**
- `PORT`: Server port (default: 8080)
- `NODE_ENV`: `development` or `production`
- `LOG_LEVEL`: `error`, `warn`, `info`, `debug`, or `trace`

#### 4. Optional Services

```bash
# IBM Watson Speech to Text (Coming Soon)
# WATSON_STT_APIKEY=your-stt-apikey
# WATSON_STT_URL=https://api.us-south.speech-to-text.watson.cloud.ibm.com
# WATSON_STT_INSTANCE_ID=your-instance-id

# Feature Flags
# ENABLE_AUDIO_TRANSCRIPTION=false
# ENABLE_DOCUMENT_GENERATION=false
# ENABLE_EXTERNAL_INTEGRATIONS=false
# ENABLE_ANALYTICS=true
```

### Environment Variable Validation

The application validates required environment variables at startup. If any are missing, you'll see an error like:

```
Error: Missing required environment variable: WATSONX_AI_APIKEY
```

## Database Initialization

The database is automatically initialized when you first run the application.

### Automatic Initialization

```bash
# The database will be created at: api/data/meeting.db
# Tables are created automatically on first run
npm run dev
```

**Expected output:**
```
Database initialized successfully
Server started successfully on port 8080
```

### Manual Database Inspection

You can inspect the database using SQLite tools:

```bash
# Install sqlite3 (if not already installed)
# macOS: brew install sqlite3
# Ubuntu: sudo apt-get install sqlite3

# Open the database
sqlite3 api/data/meeting.db

# List tables
.tables

# View schema
.schema meetings

# Exit
.quit
```

### Database Schema

The following tables are created:
- `meetings` - Meeting metadata
- `speakers` - Speaker information
- `transcript_segments` - Transcript segments with timestamps
- `actions` - Extracted action items
- `decisions` - Extracted decisions
- `risks` - Identified risks

See [ARCHITECTURE.md](./ARCHITECTURE.md#database-schema) for detailed schema information.

## Running the Application

### Development Mode

Development mode includes hot-reloading for code changes:

```bash
cd api
npm run dev
```

**Expected output:**
```
╔════════════════════════════════════════════════════════╗
║  Meeting Memory Intelligence Engine API               ║
║  Port: 8080                                           ║
║  Environment: development                             ║
║  Time: 2026-02-03T06:50:00.000Z                      ║
║                                                        ║
║  Security: ✓ Headers, CORS, Sanitization             ║
║  Rate Limiting: ✓ Enabled                            ║
║  Error Handling: ✓ Global handlers active            ║
╚════════════════════════════════════════════════════════╝
```

The server will automatically restart when you modify TypeScript files.

### Production Mode

For production deployment:

```bash
# Build the application
npm run build

# Start the production server
npm start
```

### Running in Background

To run the server in the background:

```bash
# Using nohup
nohup npm run dev > server.log 2>&1 &

# Using pm2 (recommended for production)
npm install -g pm2
pm2 start npm --name "meeting-intel" -- run dev
pm2 logs meeting-intel
pm2 stop meeting-intel
```

### Stopping the Server

```bash
# If running in foreground: Press Ctrl+C

# If running with pm2:
pm2 stop meeting-intel

# If running with nohup:
ps aux | grep node
kill <process-id>
```

## Verification

### 1. Check Server Health

```bash
curl http://localhost:8080/health
```

**Expected response:**
```json
{
  "ok": true,
  "timestamp": "2026-02-03T06:50:00.000Z",
  "env": "development",
  "version": "0.1.0"
}
```

### 2. Test File Upload

```bash
# Create a test file
echo "Test meeting notes" > test.txt

# Upload the file
curl -X POST http://localhost:8080/ingest \
  -F "files=@test.txt"
```

**Expected response:**
```json
{
  "ok": true,
  "files": [
    {
      "key": "uploads/2026-02-03/..._test.txt",
      "originalName": "test.txt",
      "size": 18,
      "type": "text/plain",
      "uploadedAt": "2026-02-03T06:50:00.000Z"
    }
  ]
}
```

### 3. Test Fact Extraction

```bash
curl -X POST http://localhost:8080/process \
  -H "Content-Type: application/json" \
  -d '{
    "transcriptText": "John will complete the documentation by Friday. We decided to use PostgreSQL."
  }'
```

**Expected response:**
```json
{
  "ok": true,
  "facts": {
    "actions": [...],
    "decisions": [...],
    "risks": [...]
  },
  "quality": {...},
  "metadata": {...}
}
```

### 4. Access Web Interface

Open your browser and navigate to:
```
http://localhost:8080
```

You should see the Meeting Memory Intelligence Engine web interface.

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Cannot find module" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "Port 8080 already in use"

**Solution:**
```bash
# Find and kill the process using port 8080
lsof -ti:8080 | xargs kill -9

# Or change the port in .env
echo "PORT=8081" >> .env
```

#### Issue: "Database locked" error

**Solution:**
```bash
# Stop all running instances
pkill -f "tsx watch"
pkill -f "node"

# Delete the database and restart
rm api/data/meeting.db
npm run dev
```

#### Issue: "watsonx.ai authentication failed"

**Possible causes:**
1. Invalid API key
2. Incorrect project ID
3. API key doesn't have access to the project

**Solution:**
```bash
# Verify your credentials
# 1. Check API key in IBM Cloud Console → IAM → API keys
# 2. Check project ID in watsonx.ai → Project settings
# 3. Ensure API key has access to the project

# Test connection
curl -X POST http://localhost:8080/process \
  -H "Content-Type: application/json" \
  -d '{"transcriptText":"test"}'
```

#### Issue: "COS upload failed"

**Possible causes:**
1. Invalid COS credentials
2. Bucket doesn't exist
3. Insufficient permissions

**Solution:**
```bash
# Verify COS credentials
# 1. Check service credentials in COS instance
# 2. Verify bucket name matches .env
# 3. Ensure API key has Writer role

# Test upload
curl -X POST http://localhost:8080/ingest \
  -F "files=@test.txt"
```

#### Issue: TypeScript compilation errors

**Solution:**
```bash
# Check TypeScript version
npx tsc --version

# Clean build
rm -rf dist/
npm run build

# If errors persist, check tsconfig.json
```

#### Issue: "ECONNREFUSED" when calling IBM services

**Possible causes:**
1. Network connectivity issues
2. Firewall blocking requests
3. Incorrect service URLs

**Solution:**
```bash
# Test network connectivity
ping cloud.ibm.com

# Check service URLs in .env
# Ensure they match your region

# Test with curl
curl -I https://us-south.ml.cloud.ibm.com
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set log level to debug
echo "LOG_LEVEL=debug" >> .env

# Restart the server
npm run dev
```

This will show detailed logs for:
- All HTTP requests
- Database queries
- IBM service calls
- Error stack traces

### Getting Help

If you encounter issues not covered here:

1. **Check the logs**: Look at console output and `api/logs/` directory
2. **Review documentation**: See [ARCHITECTURE.md](./ARCHITECTURE.md) and [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
3. **Check IBM Cloud status**: [cloud.ibm.com/status](https://cloud.ibm.com/status)
4. **GitHub Issues**: Report bugs or ask questions
5. **IBM Cloud Support**: For IBM service-specific issues

## Development Tools

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "orta.vscode-jest",
    "christian-kohler.path-intellisense"
  ]
}
```

### Useful npm Scripts

```bash
# Development with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Type checking only (no build)
npx tsc --noEmit
```

### Database Tools

**SQLite Browser** (GUI):
- Download: [sqlitebrowser.org](https://sqlitebrowser.org/)
- Open: `api/data/meeting.db`

**Command Line**:
```bash
# View all meetings
sqlite3 api/data/meeting.db "SELECT * FROM meetings;"

# Count actions by owner
sqlite3 api/data/meeting.db "SELECT owner, COUNT(*) FROM actions GROUP BY owner;"

# Export to CSV
sqlite3 -header -csv api/data/meeting.db "SELECT * FROM actions;" > actions.csv
```

### API Testing Tools

**Postman**:
1. Download from [postman.com](https://www.postman.com/)
2. Import the API collection (if provided)
3. Set base URL to `http://localhost:8080`

**HTTPie** (command line):
```bash
# Install
brew install httpie  # macOS
# or
pip install httpie   # Python

# Usage
http POST localhost:8080/process transcriptText="test"
```

### Monitoring

**View logs in real-time**:
```bash
# Follow logs
tail -f api/logs/app.log

# Filter errors only
tail -f api/logs/app.log | grep ERROR
```

**Monitor requests**:
```bash
# Watch all requests
npm run dev | grep "Incoming request"
```

## Next Steps

After successful setup:

1. **Read the API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
2. **Explore the Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Run Tests**: See [TESTING_GUIDE.md](./TESTING_GUIDE.md)
4. **Deploy to Production**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## Additional Resources

- **IBM Cloud Documentation**: [cloud.ibm.com/docs](https://cloud.ibm.com/docs)
- **watsonx.ai Documentation**: [ibm.com/docs/watsonx](https://www.ibm.com/docs/watsonx)
- **Node.js Best Practices**: [github.com/goldbergyoni/nodebestpractices](https://github.com/goldbergyoni/nodebestpractices)
- **TypeScript Handbook**: [typescriptlang.org/docs](https://www.typescriptlang.org/docs/)

---

**Last Updated**: 2026-02-03  
**Version**: 0.1.0  
**Maintainer**: Development Team