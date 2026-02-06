# Meeting Memory Intelligence Engine - API Documentation

## Table of Contents
- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [File Ingestion](#file-ingestion)
  - [Audio Transcription](#audio-transcription)
  - [Transcript Processing](#transcript-processing)
  - [Insights & Analytics](#insights--analytics)
  - [Data Export](#data-export)
  - [Meeting Management](#meeting-management)
  - [Document Generation](#document-generation)
  - [Advanced Analytics](#advanced-analytics)
  - [MCP Integration](#mcp-integration)

## Overview

The Meeting Memory Intelligence Engine API is a RESTful API that provides endpoints for uploading meeting artifacts, processing transcripts, extracting structured information, and generating insights.

**API Version**: 0.1.0  
**Protocol**: HTTP/HTTPS  
**Data Format**: JSON (except file uploads and CSV exports)

## Base URL

```
Local Development: http://localhost:8080
Production: https://your-domain.com
```

## Authentication

**Current Status**: No authentication required (v0.1.0)

**Future Versions**: Will support:
- API Key authentication
- IBM Cloud IAM integration
- OAuth 2.0

**Security Headers Required**:
```http
Content-Type: application/json
```

## Rate Limiting

The API implements three-tier rate limiting based on operation type:

### General API Endpoints
- **Limit**: 100 requests per 15 minutes
- **Applies to**: `/meetings`, `/export`, `/documents`, `/analytics`, `/mcp`

### Upload Operations
- **Limit**: 20 requests per 15 minutes
- **Applies to**: `/ingest`, `/transcribe`

### Expensive Operations
- **Limit**: 10 requests per 15 minutes
- **Applies to**: `/process`, `/insights`

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1675430400
```

### Rate Limit Exceeded Response

```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900
}
```

**Status Code**: `429 Too Many Requests`

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "requestId": "req_abc123"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `NO_FILES` | 400 | No files uploaded |
| `MISSING_TRANSCRIPT` | 400 | Required transcript text missing |
| `INVALID_MEETING_ID` | 400 | Invalid meeting ID format |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `NO_DATA` | 404 | No data available for export |
| `FILE_TOO_LARGE` | 413 | File exceeds size limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `WATSONX_ERROR` | 500 | watsonx.ai service error |
| `COS_ERROR` | 500 | Cloud Object Storage error |

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `413 Payload Too Large`: File or request too large
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## API Endpoints

---

## Health Check

### Get API Health Status

Check if the API is running and responsive.

**Endpoint**: `GET /health`  
**Rate Limit**: None

#### Request

```http
GET /health HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "ok": true,
  "timestamp": "2026-02-03T06:50:00.000Z",
  "env": "development",
  "version": "0.1.0"
}
```

**Status Code**: `200 OK`

---

## File Ingestion

### Upload Meeting Artifacts

Upload one or more files to IBM Cloud Object Storage for processing.

**Endpoint**: `POST /ingest`  
**Rate Limit**: 20 requests per 15 minutes  
**Content-Type**: `multipart/form-data`

#### Supported File Types

| Type | Extensions | MIME Types | Max Size |
|------|-----------|------------|----------|
| Text | .txt, .md | text/plain, text/markdown | 100MB |
| Documents | .pdf, .docx | application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document | 100MB |
| Audio | .mp3, .wav, .m4a | audio/mpeg, audio/wav, audio/mp4, audio/x-m4a | 100MB |

#### Request

```http
POST /ingest HTTP/1.1
Host: localhost:8080
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="files"; filename="meeting-notes.txt"
Content-Type: text/plain

[File content here]
------WebKitFormBoundary--
```

**Parameters**:
- `files` (required): One or more files (max 10 files per request)

#### Response - Success

```json
{
  "ok": true,
  "files": [
    {
      "key": "uploads/2026-02-03/1738564800000_meeting-notes.txt",
      "originalName": "meeting-notes.txt",
      "size": 15234,
      "type": "text/plain",
      "uploadedAt": "2026-02-03T06:50:00.000Z"
    }
  ]
}
```

**Status Code**: `200 OK`

#### Response - Partial Success

```json
{
  "ok": true,
  "files": [
    {
      "key": "uploads/2026-02-03/1738564800000_file1.txt",
      "originalName": "file1.txt",
      "size": 1024,
      "type": "text/plain",
      "uploadedAt": "2026-02-03T06:50:00.000Z"
    }
  ],
  "warnings": [
    {
      "file": "file2.txt",
      "error": "Upload failed"
    }
  ],
  "message": "1 of 2 files uploaded successfully"
}
```

**Status Code**: `200 OK`

#### Response - Error

```json
{
  "error": "No files uploaded",
  "code": "NO_FILES"
}
```

**Status Code**: `400 Bad Request`

#### cURL Example

```bash
curl -X POST http://localhost:8080/ingest \
  -F "files=@meeting-notes.txt" \
  -F "files=@recording.mp3"
```

---

## Audio Transcription

### Transcribe Audio File

Convert an audio file to text using IBM Watson Speech-to-Text.

**Endpoint**: `POST /transcribe`  
**Rate Limit**: 20 requests per 15 minutes  
**Status**: Coming Soon

#### Request

```json
{
  "cosKey": "uploads/2026-02-03/1738564800000_recording.mp3",
  "language": "en-US",
  "enableSpeakerDiarization": true
}
```

**Parameters**:
- `cosKey` (required): COS key of the audio file
- `language` (optional): Language code (default: "en-US")
- `enableSpeakerDiarization` (optional): Enable speaker identification (default: true)

#### Response

```json
{
  "ok": true,
  "transcript": {
    "fullText": "Welcome to the meeting. Let's discuss the project status...",
    "segments": [
      {
        "speaker": "Speaker 0",
        "text": "Welcome to the meeting.",
        "startTime": 0.0,
        "endTime": 2.5,
        "confidence": 0.95
      }
    ],
    "speakers": [
      {
        "label": "Speaker 0",
        "totalSpeakingTime": 120.5
      }
    ]
  }
}
```

**Status Code**: `200 OK`

---

## Transcript Processing

### Extract Facts from Transcript

Process a meeting transcript and extract structured information (actions, decisions, risks).

**Endpoint**: `POST /process`  
**Rate Limit**: 10 requests per 15 minutes

#### Request

```json
{
  "transcriptText": "John will complete the API documentation by Friday. We decided to use PostgreSQL for production. There's a risk of missing the deadline if we don't get additional resources.",
  "meetingType": "planning",
  "meetingId": 123
}
```

**Parameters**:
- `transcriptText` (required): The meeting transcript (minimum 10 characters)
- `meetingType` (optional): Type of meeting - `standup`, `planning`, `retrospective`, `client`, or `other`
- `meetingId` (optional): ID of the meeting to associate facts with

#### Response

```json
{
  "ok": true,
  "facts": {
    "actions": [
      {
        "owner": "John",
        "description": "Complete the API documentation",
        "due_date": "2026-02-07",
        "confidence": 0.92
      }
    ],
    "decisions": [
      {
        "summary": "Use PostgreSQL for production",
        "rationale": "Better scalability and performance",
        "date": "2026-02-03"
      }
    ],
    "risks": [
      {
        "summary": "Missing the deadline without additional resources",
        "severity": "high",
        "owner_if_any": null
      }
    ]
  },
  "quality": {
    "score": 0.87,
    "issues": []
  },
  "metadata": {
    "itemCount": {
      "actions": 1,
      "decisions": 1,
      "risks": 1,
      "total": 3
    },
    "meetingType": "planning",
    "meetingId": 123
  }
}
```

**Status Code**: `200 OK`

#### Response - Error

```json
{
  "error": "transcriptText required",
  "code": "MISSING_TRANSCRIPT"
}
```

**Status Code**: `400 Bad Request`

#### Meeting Types

Different meeting types use specialized prompts for better extraction:

- **standup**: Focus on action items, blockers, quick decisions
- **planning**: Emphasis on goals, milestones, resource allocation
- **retrospective**: What went well, what to improve, action items
- **client**: Decisions, commitments, next steps, risks
- **other**: General-purpose extraction

#### cURL Example

```bash
curl -X POST http://localhost:8080/process \
  -H "Content-Type: application/json" \
  -d '{
    "transcriptText": "John will complete the API documentation by Friday.",
    "meetingType": "planning"
  }'
```

---

## Insights & Analytics

### Get Decision Timeline

Retrieve chronological timeline of all decisions.

**Endpoint**: `GET /insights/timeline`  
**Rate Limit**: 10 requests per 15 minutes

#### Request

```http
GET /insights/timeline HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "ok": true,
  "decisions": [
    {
      "id": 1,
      "meeting_id": 123,
      "summary": "Use PostgreSQL for production",
      "rationale": "Better scalability",
      "date": "2026-02-03",
      "impact": "high",
      "stakeholders": "[\"Engineering\",\"DevOps\"]",
      "created_at": "2026-02-03T06:50:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2026-02-03T06:50:00.000Z"
}
```

**Status Code**: `200 OK`

---

### Get Action Items by Owner

Retrieve action item counts grouped by owner.

**Endpoint**: `GET /insights/owners`  
**Rate Limit**: 10 requests per 15 minutes

#### Request

```http
GET /insights/owners HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "ok": true,
  "owners": [
    {
      "owner": "John",
      "cnt": 5,
      "high_confidence_count": 4
    },
    {
      "owner": "Sarah",
      "cnt": 3,
      "high_confidence_count": 3
    }
  ],
  "totalOwners": 2,
  "timestamp": "2026-02-03T06:50:00.000Z"
}
```

**Status Code**: `200 OK`

---

### Get Risk Analysis

Retrieve all identified risks with severity breakdown.

**Endpoint**: `GET /insights/risks`  
**Rate Limit**: 10 requests per 15 minutes

#### Request

```http
GET /insights/risks HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "ok": true,
  "risks": [
    {
      "id": 1,
      "meeting_id": 123,
      "summary": "Missing deadline without additional resources",
      "severity": "high",
      "owner_if_any": "Project Manager",
      "mitigation_plan": "Hire contractors",
      "status": "identified",
      "created_at": "2026-02-03T06:50:00.000Z",
      "updated_at": "2026-02-03T06:50:00.000Z"
    }
  ],
  "count": 1,
  "bySeverity": {
    "high": 1,
    "med": 0,
    "low": 0
  },
  "timestamp": "2026-02-03T06:50:00.000Z"
}
```

**Status Code**: `200 OK`

---

### Get Summary Statistics

Retrieve overall summary statistics across all meetings.

**Endpoint**: `GET /insights/summary`  
**Rate Limit**: 10 requests per 15 minutes

#### Request

```http
GET /insights/summary HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "ok": true,
  "summary": {
    "totalActions": 25,
    "totalDecisions": 12,
    "totalRisks": 5,
    "highPriorityRisks": 2
  },
  "recentActions": [
    {
      "id": 25,
      "owner": "John",
      "description": "Complete API documentation",
      "due_date": "2026-02-07",
      "confidence": 0.92,
      "status": "pending",
      "priority": "high",
      "created_at": "2026-02-03T06:50:00.000Z"
    }
  ],
  "timestamp": "2026-02-03T06:50:00.000Z"
}
```

**Status Code**: `200 OK`

---

## Data Export

### Export Actions as CSV

Export all action items as a CSV file.

**Endpoint**: `GET /export/csv/actions`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /export/csv/actions HTTP/1.1
Host: localhost:8080
```

#### Response

```csv
owner,description,due_date,confidence,created_at
John,Complete API documentation,2026-02-07,0.92,2026-02-03T06:50:00.000Z
Sarah,Review pull requests,2026-02-05,0.88,2026-02-03T06:50:00.000Z
```

**Status Code**: `200 OK`  
**Content-Type**: `text/csv`  
**Content-Disposition**: `attachment; filename="actions_1738564800000.csv"`

#### Response - No Data

```json
{
  "error": "No actions found to export",
  "code": "NO_DATA"
}
```

**Status Code**: `404 Not Found`

---

### Export Decisions as CSV

Export all decisions as a CSV file.

**Endpoint**: `GET /export/csv/decisions`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /export/csv/decisions HTTP/1.1
Host: localhost:8080
```

#### Response

```csv
summary,rationale,date,created_at
Use PostgreSQL for production,Better scalability,2026-02-03,2026-02-03T06:50:00.000Z
```

**Status Code**: `200 OK`  
**Content-Type**: `text/csv`

---

### Export Risks as CSV

Export all risks as a CSV file.

**Endpoint**: `GET /export/csv/risks`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /export/csv/risks HTTP/1.1
Host: localhost:8080
```

#### Response

```csv
summary,severity,owner,created_at
Missing deadline,high,Project Manager,2026-02-03T06:50:00.000Z
```

**Status Code**: `200 OK`  
**Content-Type**: `text/csv`

---

### Export All Facts as JSON

Export all facts (actions, decisions, risks) as JSON.

**Endpoint**: `GET /export/json/facts`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /export/json/facts HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "ok": true,
  "actions": [...],
  "decisions": [...],
  "risks": [...],
  "metadata": {
    "exportedAt": "2026-02-03T06:50:00.000Z",
    "counts": {
      "actions": 25,
      "decisions": 12,
      "risks": 5,
      "total": 42
    }
  }
}
```

**Status Code**: `200 OK`

---

## Meeting Management

### Create Meeting

Create a new meeting record.

**Endpoint**: `POST /meetings`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```json
{
  "title": "Sprint Planning Meeting",
  "meeting_type": "planning",
  "meeting_date": "2026-02-03T14:00:00.000Z",
  "duration_minutes": 60,
  "location": "Conference Room A",
  "language": "en-US",
  "status": "scheduled"
}
```

**Parameters**:
- `title` (required): Meeting title (1-200 characters)
- `meeting_type` (required): One of: `standup`, `planning`, `retrospective`, `client`, `other`
- `meeting_date` (required): ISO 8601 date-time
- `duration_minutes` (optional): Duration in minutes
- `location` (optional): Meeting location (max 200 characters)
- `cos_audio_key` (optional): COS key for audio recording
- `cos_transcript_key` (optional): COS key for transcript
- `language` (optional): Language code (default: "en-US")
- `status` (optional): One of: `scheduled`, `in_progress`, `completed`, `cancelled` (default: "scheduled")

#### Response

```json
{
  "success": true,
  "meeting": {
    "id": 123,
    "title": "Sprint Planning Meeting",
    "meeting_type": "planning",
    "meeting_date": "2026-02-03T14:00:00.000Z",
    "duration_minutes": 60,
    "location": "Conference Room A",
    "language": "en-US",
    "status": "scheduled",
    "created_at": "2026-02-03T06:50:00.000Z",
    "updated_at": "2026-02-03T06:50:00.000Z"
  },
  "message": "Meeting created successfully"
}
```

**Status Code**: `201 Created`

---

### Get All Meetings

Retrieve all meetings with pagination.

**Endpoint**: `GET /meetings`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /meetings?limit=50&offset=0 HTTP/1.1
Host: localhost:8080
```

**Query Parameters**:
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Offset for pagination (default: 0)

#### Response

```json
{
  "success": true,
  "meetings": [
    {
      "id": 123,
      "title": "Sprint Planning Meeting",
      "meeting_type": "planning",
      "meeting_date": "2026-02-03T14:00:00.000Z",
      "status": "scheduled",
      "created_at": "2026-02-03T06:50:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 1
  }
}
```

**Status Code**: `200 OK`

---

### Get Meeting by ID

Retrieve a specific meeting.

**Endpoint**: `GET /meetings/:id`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /meetings/123 HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "success": true,
  "meeting": {
    "id": 123,
    "title": "Sprint Planning Meeting",
    "meeting_type": "planning",
    "meeting_date": "2026-02-03T14:00:00.000Z",
    "duration_minutes": 60,
    "location": "Conference Room A",
    "status": "scheduled",
    "created_at": "2026-02-03T06:50:00.000Z",
    "updated_at": "2026-02-03T06:50:00.000Z"
  }
}
```

**Status Code**: `200 OK`

#### Response - Not Found

```json
{
  "success": false,
  "error": "Meeting not found"
}
```

**Status Code**: `404 Not Found`

---

### Update Meeting

Update an existing meeting.

**Endpoint**: `PUT /meetings/:id`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```json
{
  "status": "completed",
  "duration_minutes": 75
}
```

**Parameters**: Same as Create Meeting (all optional)

#### Response

```json
{
  "success": true,
  "meeting": {
    "id": 123,
    "title": "Sprint Planning Meeting",
    "status": "completed",
    "duration_minutes": 75,
    "updated_at": "2026-02-03T07:00:00.000Z"
  },
  "message": "Meeting updated successfully"
}
```

**Status Code**: `200 OK`

---

### Delete Meeting

Delete a meeting and all associated data (cascades to speakers, transcripts, etc.).

**Endpoint**: `DELETE /meetings/:id`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
DELETE /meetings/123 HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "success": true,
  "message": "Meeting deleted successfully"
}
```

**Status Code**: `200 OK`

---

### Get Meeting Statistics

Retrieve statistics for a specific meeting.

**Endpoint**: `GET /meetings/:id/stats`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /meetings/123/stats HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "success": true,
  "meeting_id": 123,
  "stats": {
    "speakerCount": 5,
    "transcriptSegments": 150,
    "totalDuration": 3600,
    "actionCount": 8,
    "decisionCount": 3,
    "riskCount": 2
  }
}
```

**Status Code**: `200 OK`

---

### Add Speaker to Meeting

Add a speaker to a meeting.

**Endpoint**: `POST /meetings/:id/speakers`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```json
{
  "speaker_label": "Speaker 0",
  "speaker_name": "John Doe",
  "email": "john@example.com",
  "role": "Product Manager",
  "total_speaking_time_seconds": 450.5
}
```

**Parameters**:
- `speaker_label` (required): Speaker identifier (e.g., "Speaker 0")
- `speaker_name` (optional): Human-readable name
- `email` (optional): Email address
- `role` (optional): Role or title
- `total_speaking_time_seconds` (optional): Total speaking time

#### Response

```json
{
  "success": true,
  "speaker_id": 456,
  "message": "Speaker added successfully"
}
```

**Status Code**: `201 Created`

---

### Get Meeting Speakers

Retrieve all speakers for a meeting.

**Endpoint**: `GET /meetings/:id/speakers`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /meetings/123/speakers HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "success": true,
  "meeting_id": 123,
  "speakers": [
    {
      "id": 456,
      "meeting_id": 123,
      "speaker_label": "Speaker 0",
      "speaker_name": "John Doe",
      "email": "john@example.com",
      "role": "Product Manager",
      "total_speaking_time_seconds": 450.5,
      "created_at": "2026-02-03T06:50:00.000Z"
    }
  ]
}
```

**Status Code**: `200 OK`

---

### Get Meeting Transcript

Retrieve the full transcript for a meeting.

**Endpoint**: `GET /meetings/:id/transcript`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /meetings/123/transcript HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "success": true,
  "meeting_id": 123,
  "full_text": "Welcome to the meeting. Let's discuss the project status...",
  "segments": [
    {
      "id": 1,
      "meeting_id": 123,
      "speaker_id": 456,
      "text": "Welcome to the meeting.",
      "start_time": 0.0,
      "end_time": 2.5,
      "confidence": 0.95,
      "sequence_number": 1,
      "created_at": "2026-02-03T06:50:00.000Z"
    }
  ]
}
```

**Status Code**: `200 OK`

---

## Document Generation

### Generate Meeting Report

Generate a formatted document from meeting data.

**Endpoint**: `POST /documents/generate`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```json
{
  "meetingId": 123,
  "format": "markdown",
  "includeTranscript": true,
  "includeActions": true,
  "includeDecisions": true,
  "includeRisks": true
}
```

**Parameters**:
- `meetingId` (required): Meeting ID
- `format` (optional): Output format - `markdown`, `html`, `pdf` (default: "markdown")
- `includeTranscript` (optional): Include full transcript (default: true)
- `includeActions` (optional): Include action items (default: true)
- `includeDecisions` (optional): Include decisions (default: true)
- `includeRisks` (optional): Include risks (default: true)

#### Response

```json
{
  "ok": true,
  "document": {
    "format": "markdown",
    "content": "# Sprint Planning Meeting\n\n## Actions\n...",
    "generatedAt": "2026-02-03T06:50:00.000Z"
  }
}
```

**Status Code**: `200 OK`

---

## Advanced Analytics

### Get Trend Analysis

Analyze trends across multiple meetings.

**Endpoint**: `GET /analytics/trends`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /analytics/trends?startDate=2026-01-01&endDate=2026-02-03 HTTP/1.1
Host: localhost:8080
```

**Query Parameters**:
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `meetingType` (optional): Filter by meeting type

#### Response

```json
{
  "ok": true,
  "trends": {
    "actionTrend": [
      { "date": "2026-01-01", "count": 5 },
      { "date": "2026-01-08", "count": 8 }
    ],
    "decisionTrend": [...],
    "riskTrend": [...]
  }
}
```

**Status Code**: `200 OK`

---

## MCP Integration

### Get MCP Server Status

Check MCP (Model Context Protocol) server status.

**Endpoint**: `GET /mcp/status`  
**Rate Limit**: 100 requests per 15 minutes

#### Request

```http
GET /mcp/status HTTP/1.1
Host: localhost:8080
```

#### Response

```json
{
  "ok": true,
  "mcp": {
    "enabled": true,
    "exportDirectory": "./exports",
    "toolsAvailable": ["read_file", "write_file", "list_directory"]
  }
}
```

**Status Code**: `200 OK`

---

## Code Examples

### JavaScript/Node.js

```javascript
// Upload files
const formData = new FormData();
formData.append('files', fileBlob, 'meeting-notes.txt');

const uploadResponse = await fetch('http://localhost:8080/ingest', {
  method: 'POST',
  body: formData
});

const uploadResult = await uploadResponse.json();
console.log('Uploaded:', uploadResult.files);

// Process transcript
const processResponse = await fetch('http://localhost:8080/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcriptText: 'Meeting transcript here...',
    meetingType: 'planning'
  })
});

const facts = await processResponse.json();
console.log('Extracted facts:', facts);
```

### Python

```python
import requests

# Upload files
files = {'files': open('meeting-notes.txt', 'rb')}
response = requests.post('http://localhost:8080/ingest', files=files)
print(response.json())

# Process transcript
data = {
    'transcriptText': 'Meeting transcript here...',
    'meetingType': 'planning'
}
response = requests.post('http://localhost:8080/process', json=data)
print(response.json())
```

### cURL

```bash
# Upload file
curl -X POST http://localhost:8080/ingest \
  -F "files=@meeting-notes.txt"

# Process transcript
curl -X POST http://localhost:8080/process \
  -H "Content-Type: application/json" \
  -d '{"transcriptText":"Meeting transcript...","meetingType":"planning"}'

# Get insights
curl http://localhost:8080/insights/summary

# Export as CSV
curl http://localhost:8080/export/csv/actions -o actions.csv
```

---

## Webhooks (Future)

**Status**: Planned for future release

Will support webhooks for:
- Meeting completion
- New action items
- High-priority risks identified
- Export completion

---

## Changelog

### v0.1.0 (Current)
- Initial API release
- File ingestion endpoints
- Transcript processing
- Insights and analytics
- Export functionality
- Meeting management
- Rate limiting
- Error handling

---

**Last Updated**: 2026-02-03  
**API Version**: 0.1.0  
**Support**: See README.md for contact information