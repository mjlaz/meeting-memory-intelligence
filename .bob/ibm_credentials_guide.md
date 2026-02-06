# IBM Services - API Keys & Credentials Guide

**Document Purpose:** Complete guide to obtaining and configuring all IBM service credentials  
**Last Updated:** 2026-02-02  
**Status:** Reference Document

---

## Overview

This project integrates multiple IBM Cloud services. Below is a complete list of required credentials, how to obtain them, and where to configure them.

---

## Required IBM Services

### 1. IBM Watson Speech to Text
**Purpose:** Convert audio recordings to text transcripts with speaker identification

**Required Credentials:**
```env
WATSON_STT_APIKEY=<your-api-key>
WATSON_STT_URL=https://<region>.speech-to-text.watson.cloud.ibm.com
WATSON_STT_INSTANCE_ID=<instance-id>
```

**How to Obtain:**

1. **Create Service Instance**
   - Go to [IBM Cloud Catalog](https://cloud.ibm.com/catalog)
   - Search for "Speech to Text"
   - Click "Create"
   - Select plan (Lite for testing, Standard for production)
   - Choose region (us-south, eu-gb, etc.)
   - Click "Create"

2. **Get API Key**
   - After creation, go to service dashboard
   - Click "Manage" in left sidebar
   - Under "Credentials", click "Show credentials"
   - Copy the `apikey` value
   - Copy the `url` value

3. **Get Instance ID**
   - In service dashboard, click "Service credentials"
   - If no credentials exist, click "New credential"
   - Click "View credentials"
   - Copy the `instance_id` or `resource_instance_id`

**Configuration:**
```bash
# Add to api/.env
WATSON_STT_APIKEY=abc123xyz789...
WATSON_STT_URL=https://api.us-south.speech-to-text.watson.cloud.ibm.com/instances/abc-123
WATSON_STT_INSTANCE_ID=crn:v1:bluemix:public:speech-to-text:us-south:a/...
```

**Pricing:**
- Lite: 500 minutes/month (free)
- Standard: $0.02/minute

---

### 2. IBM watsonx.ai
**Purpose:** Extract structured insights (actions, decisions, risks) from meeting transcripts

**Required Credentials:**
```env
WATSONX_AI_AUTH_TYPE=iam
WATSONX_AI_APIKEY=<your-api-key>
WATSONX_AI_SERVICE_URL=https://<region>.ml.cloud.ibm.com
WATSONX_AI_PROJECT_ID=<project-id>
WATSONX_MODEL_ID=ibm/granite-3-8b-instruct
WATSONX_API_VERSION=2025-02-11
```

**How to Obtain:**

1. **Create watsonx.ai Project**
   - Go to [watsonx.ai](https://dataplatform.cloud.ibm.com/wx/home)
   - Click "Create a project"
   - Select "Create an empty project"
   - Name it (e.g., "Meeting Intelligence")
   - Click "Create"

2. **Get Project ID**
   - In your project, click "Manage" tab
   - Click "General"
   - Copy the "Project ID"

3. **Get API Key**
   - Click your profile icon (top right)
   - Select "Profile and settings"
   - Click "API keys" tab
   - Click "Create API key"
   - Name it (e.g., "meeting-intel-api")
   - Copy the API key (save it securely!)

4. **Get Service URL**
   - Based on your region:
     - US South: `https://us-south.ml.cloud.ibm.com`
     - EU Germany: `https://eu-de.ml.cloud.ibm.com`
     - Japan Tokyo: `https://jp-tok.ml.cloud.ibm.com`

**Configuration:**
```bash
# Add to api/.env
WATSONX_AI_AUTH_TYPE=iam
WATSONX_AI_APIKEY=abc123xyz789...
WATSONX_AI_SERVICE_URL=https://us-south.ml.cloud.ibm.com
WATSONX_AI_PROJECT_ID=abc-123-def-456
WATSONX_MODEL_ID=ibm/granite-3-8b-instruct
WATSONX_API_VERSION=2025-02-11
```

**Available Models:**
- `ibm/granite-3-8b-instruct` (recommended)
- `ibm/granite-13b-chat-v2`
- `meta-llama/llama-3-70b-instruct`

**Pricing:**
- Lite: Limited tokens/month (free)
- Standard: Pay per token

---

### 3. IBM Cloud Object Storage (COS)
**Purpose:** Store audio files, transcripts, and generated documents

**Required Credentials:**
```env
COS_ENDPOINT=https://s3.<region>.cloud-object-storage.appdomain.cloud
COS_API_KEY_ID=<your-api-key>
COS_INSTANCE_CRN=<resource-instance-id>
COS_BUCKET=meeting-intel-uploads
```

**How to Obtain:**

1. **Create COS Instance**
   - Go to [IBM Cloud Catalog](https://cloud.ibm.com/catalog)
   - Search for "Object Storage"
   - Click "Create"
   - Select plan (Lite for testing, Standard for production)
   - Click "Create"

2. **Create Bucket**
   - In COS dashboard, click "Create bucket"
   - Select "Customize your bucket"
   - Name it: `meeting-intel-uploads`
   - Select resiliency: Regional
   - Select location: us-south (or your region)
   - Click "Create bucket"

3. **Get API Key**
   - In COS dashboard, click "Service credentials"
   - Click "New credential"
   - Name it: "meeting-intel-api"
   - Role: Writer
   - Click "Add"
   - Click "View credentials"
   - Copy `apikey` value

4. **Get Instance CRN**
   - In credentials, copy `resource_instance_id` (this is the CRN)

5. **Get Endpoint**
   - In bucket details, click "Configuration"
   - Under "Endpoints", find "Public" endpoint
   - Copy the endpoint URL
   - Format: `https://s3.us-south.cloud-object-storage.appdomain.cloud`

**Configuration:**
```bash
# Add to api/.env
COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud
COS_API_KEY_ID=abc123xyz789...
COS_INSTANCE_CRN=crn:v1:bluemix:public:cloud-object-storage:global:a/...
COS_BUCKET=meeting-intel-uploads
```

**Pricing:**
- Lite: 25GB storage, 2,000 Class A requests/month (free)
- Standard: Pay per GB and request

---

### 4. IBM Business Automation Workflow (BAW)
**Purpose:** Orchestrate task assignment and approval workflows

**Required Credentials:**
```env
BAW_URL=https://<instance>.bpm.ibmcloud.com
BAW_CLIENT_ID=<client-id>
BAW_CLIENT_SECRET=<client-secret>
BAW_USERNAME=<username>
BAW_PASSWORD=<password>
```

**How to Obtain:**

1. **Create BAW Instance**
   - Go to [IBM Cloud Catalog](https://cloud.ibm.com/catalog)
   - Search for "Business Automation Workflow"
   - Click "Create"
   - Select plan
   - Click "Create"

2. **Get Instance URL**
   - In BAW dashboard, find your instance URL
   - Format: `https://<instance-name>.bpm.ibmcloud.com`

3. **Create OAuth Client**
   - In BAW admin console, go to "Security"
   - Click "OAuth Clients"
   - Click "Create"
   - Name: "meeting-intel-api"
   - Grant types: Client Credentials
   - Copy Client ID and Client Secret

4. **Get User Credentials**
   - Use your IBM Cloud credentials
   - Or create a service account in BAW

**Configuration:**
```bash
# Add to api/.env
BAW_URL=https://my-instance.bpm.ibmcloud.com
BAW_CLIENT_ID=abc123
BAW_CLIENT_SECRET=xyz789
BAW_USERNAME=admin@example.com
BAW_PASSWORD=SecurePassword123
```

**Note:** BAW may require enterprise plan. For MVP, we can mock this integration.

**Pricing:**
- Enterprise plan required
- Contact IBM Sales for pricing

---

### 5. IBM Robotic Process Automation (RPA)
**Purpose:** Automate task creation in external systems (Jira, Asana, Salesforce)

**Required Credentials:**
```env
RPA_API_URL=https://<region>.rpa.ibmcloud.com/api/v1
RPA_API_KEY=<api-key>
RPA_TENANT_ID=<tenant-id>
```

**How to Obtain:**

1. **Create RPA Instance**
   - Go to [IBM Cloud Catalog](https://cloud.ibm.com/catalog)
   - Search for "Robotic Process Automation"
   - Click "Create"
   - Select plan
   - Click "Create"

2. **Get API Key**
   - In RPA dashboard, go to "Settings"
   - Click "API Keys"
   - Click "Generate new key"
   - Name: "meeting-intel-api"
   - Copy the API key

3. **Get Tenant ID**
   - In RPA dashboard, go to "Settings"
   - Copy the "Tenant ID"

4. **Get API URL**
   - Based on your region:
     - US: `https://us.rpa.ibmcloud.com/api/v1`
     - EU: `https://eu.rpa.ibmcloud.com/api/v1`

**Configuration:**
```bash
# Add to api/.env
RPA_API_URL=https://us.rpa.ibmcloud.com/api/v1
RPA_API_KEY=abc123xyz789...
RPA_TENANT_ID=tenant-123
```

**Note:** RPA may require enterprise plan. For MVP, we can use direct API integrations to Jira/Asana.

**Pricing:**
- Enterprise plan required
- Contact IBM Sales for pricing

---

## External System Credentials (Optional)

### Jira
**Purpose:** Create and track action items

```env
JIRA_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=<api-token>
JIRA_PROJECT_KEY=PROJ
```

**How to Obtain:**
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Copy the token
4. Get your Jira URL and project key

### Asana
**Purpose:** Create and track action items

```env
ASANA_ACCESS_TOKEN=<personal-access-token>
ASANA_WORKSPACE_ID=<workspace-id>
```

**How to Obtain:**
1. Go to [Asana Developer Console](https://app.asana.com/0/developer-console)
2. Click "Create new token"
3. Copy the token
4. Get workspace ID from Asana URL

### Salesforce
**Purpose:** Create tasks and log activities

```env
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
SALESFORCE_ACCESS_TOKEN=<access-token>
SALESFORCE_CLIENT_ID=<connected-app-client-id>
SALESFORCE_CLIENT_SECRET=<connected-app-client-secret>
```

**How to Obtain:**
1. Create Connected App in Salesforce Setup
2. Get Client ID and Secret
3. Use OAuth flow to get access token

---

## Complete .env Template

```bash
# ============================================
# IBM Watson Speech to Text
# ============================================
WATSON_STT_APIKEY=
WATSON_STT_URL=https://api.us-south.speech-to-text.watson.cloud.ibm.com
WATSON_STT_INSTANCE_ID=

# ============================================
# IBM watsonx.ai
# ============================================
WATSONX_AI_AUTH_TYPE=iam
WATSONX_AI_APIKEY=
WATSONX_AI_SERVICE_URL=https://us-south.ml.cloud.ibm.com
WATSONX_AI_PROJECT_ID=
WATSONX_MODEL_ID=ibm/granite-3-8b-instruct
WATSONX_API_VERSION=2025-02-11

# ============================================
# IBM Cloud Object Storage
# ============================================
COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud
COS_API_KEY_ID=
COS_INSTANCE_CRN=
COS_BUCKET=meeting-intel-uploads

# ============================================
# IBM Business Automation Workflow (Optional)
# ============================================
BAW_URL=
BAW_CLIENT_ID=
BAW_CLIENT_SECRET=
BAW_USERNAME=
BAW_PASSWORD=

# ============================================
# IBM RPA (Optional)
# ============================================
RPA_API_URL=
RPA_API_KEY=
RPA_TENANT_ID=

# ============================================
# External Systems (Optional)
# ============================================
# Jira
JIRA_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=

# Asana
ASANA_ACCESS_TOKEN=
ASANA_WORKSPACE_ID=

# Salesforce
SALESFORCE_INSTANCE_URL=
SALESFORCE_ACCESS_TOKEN=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=

# ============================================
# Application Settings
# ============================================
PORT=8080
NODE_ENV=development
LOG_LEVEL=info
```

---

## Setup Priority

### Phase 1: Essential (Required for MVP)
1. ✅ **Watson Speech to Text** - Core functionality
2. ✅ **watsonx.ai** - Core functionality
3. ✅ **IBM Cloud Object Storage** - Core functionality

### Phase 2: Enhanced (Recommended)
4. ⚠️ **Jira API** - Direct integration (no RPA needed)
5. ⚠️ **Asana API** - Direct integration (no RPA needed)

### Phase 3: Advanced (Optional/Future)
6. ⏸️ **IBM BAW** - Can be mocked for demo
7. ⏸️ **IBM RPA** - Can use direct APIs instead
8. ⏸️ **Salesforce** - Future enhancement

---

## Cost Estimation

### Free Tier (Lite Plans)
- Watson STT: 500 minutes/month
- watsonx.ai: Limited tokens
- COS: 25GB storage
- **Total: $0/month**

### Development Tier
- Watson STT Standard: ~$10/month (500 minutes)
- watsonx.ai Standard: ~$20/month
- COS Standard: ~$5/month (100GB)
- **Total: ~$35/month**

### Production Tier
- Watson STT: ~$100/month (5,000 minutes)
- watsonx.ai: ~$200/month
- COS: ~$20/month (500GB)
- BAW: Enterprise pricing
- RPA: Enterprise pricing
- **Total: ~$320/month + enterprise services**

---

## Security Best Practices

### 1. Never Commit Credentials
```bash
# Add to .gitignore
.env
.env.local
.env.*.local
api/.env
```

### 2. Use Environment Variables
```bash
# Load from .env file
require('dotenv').config();

# Access in code
const apiKey = process.env.WATSON_STT_APIKEY;
```

### 3. Rotate Keys Regularly
- Rotate API keys every 90 days
- Use separate keys for dev/staging/prod
- Revoke unused keys immediately

### 4. Limit Permissions
- Use least privilege principle
- Create service-specific credentials
- Don't use personal credentials for services

### 5. Monitor Usage
- Set up billing alerts
- Monitor API usage
- Track unusual activity

---

## Troubleshooting

### Common Issues

**Issue:** "Invalid API key"
- **Solution:** Verify key is copied correctly (no spaces)
- Check key hasn't expired
- Ensure correct service instance

**Issue:** "Region mismatch"
- **Solution:** Ensure URL region matches service region
- Update endpoint URL to correct region

**Issue:** "Quota exceeded"
- **Solution:** Check usage in IBM Cloud dashboard
- Upgrade plan if needed
- Implement rate limiting

**Issue:** "Connection timeout"
- **Solution:** Check network connectivity
- Verify firewall rules
- Ensure service is running

---

## Support Resources

### IBM Cloud Support
- [IBM Cloud Docs](https://cloud.ibm.com/docs)
- [Watson STT Docs](https://cloud.ibm.com/docs/speech-to-text)
- [watsonx.ai Docs](https://cloud.ibm.com/docs/watsonx)
- [COS Docs](https://cloud.ibm.com/docs/cloud-object-storage)

### Community
- [IBM Developer](https://developer.ibm.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/ibm-cloud)
- [IBM Cloud Community](https://community.ibm.com/community/user/cloud/home)

### Contact
- IBM Cloud Support: [support.ibm.com](https://www.ibm.com/support)
- Sales: [ibm.com/contact](https://www.ibm.com/contact)

---

**Document Status:** Complete  
**Last Verified:** 2026-02-02  
**Next Review:** After service setup