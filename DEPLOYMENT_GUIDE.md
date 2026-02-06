# Meeting Memory Intelligence Engine - Deployment Guide

## Table of Contents
- [Overview](#overview)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Docker Deployment](#docker-deployment)
- [IBM Cloud Code Engine Deployment](#ibm-cloud-code-engine-deployment)
- [Environment Configuration](#environment-configuration)
- [Security Considerations](#security-considerations)
- [Monitoring and Logging](#monitoring-and-logging)
- [Scaling Recommendations](#scaling-recommendations)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting Production Issues](#troubleshooting-production-issues)

## Overview

This guide covers deploying the Meeting Memory Intelligence Engine to production environments, with a focus on containerized deployment using Docker and IBM Cloud Code Engine.

### Deployment Options

1. **Docker Container** - Portable, can run anywhere
2. **IBM Cloud Code Engine** - Serverless, auto-scaling, managed
3. **Kubernetes** - Advanced orchestration (future)
4. **Traditional VM** - Direct Node.js deployment

This guide focuses on options 1 and 2, which are recommended for most use cases.

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

### ✅ Infrastructure Requirements

- [ ] IBM Cloud account with billing enabled
- [ ] IBM Cloud Object Storage instance and bucket created
- [ ] IBM watsonx.ai project configured
- [ ] Domain name (optional, for custom URLs)
- [ ] SSL/TLS certificate (if using custom domain)

### ✅ Application Requirements

- [ ] All tests passing (`npm test`)
- [ ] Environment variables configured for production
- [ ] Database migration strategy planned
- [ ] Backup strategy defined
- [ ] Monitoring tools configured

### ✅ Security Requirements

- [ ] API keys rotated and secured
- [ ] CORS origins configured for production
- [ ] Rate limiting configured appropriately
- [ ] Security headers enabled
- [ ] Secrets management solution in place

### ✅ Documentation

- [ ] API documentation up to date
- [ ] Runbook for common operations
- [ ] Incident response plan
- [ ] Contact information for on-call team

## Docker Deployment

### Step 1: Build Docker Image

The project includes a production-ready Dockerfile at `api/Dockerfile`.

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

**Build the image:**

```bash
# Navigate to the api directory
cd api

# Build the Docker image
docker build -t meeting-intel-api:latest .

# Verify the image
docker images | grep meeting-intel-api
```

**Expected output:**
```
meeting-intel-api   latest   abc123def456   2 minutes ago   250MB
```

### Step 2: Test Locally

Before deploying, test the Docker image locally:

```bash
# Run the container
docker run -d \
  --name meeting-intel-test \
  -p 8080:8080 \
  --env-file .env \
  meeting-intel-api:latest

# Check logs
docker logs meeting-intel-test

# Test the API
curl http://localhost:8080/health

# Stop and remove
docker stop meeting-intel-test
docker rm meeting-intel-test
```

### Step 3: Push to Container Registry

#### Option A: Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag the image
docker tag meeting-intel-api:latest yourusername/meeting-intel-api:latest
docker tag meeting-intel-api:latest yourusername/meeting-intel-api:v0.1.0

# Push to Docker Hub
docker push yourusername/meeting-intel-api:latest
docker push yourusername/meeting-intel-api:v0.1.0
```

#### Option B: IBM Cloud Container Registry

```bash
# Install IBM Cloud CLI
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

# Login to IBM Cloud
ibmcloud login --apikey YOUR_API_KEY

# Target a region
ibmcloud cr region-set us-south

# Create a namespace (one-time)
ibmcloud cr namespace-add meeting-intel

# Login to the registry
ibmcloud cr login

# Tag the image
docker tag meeting-intel-api:latest us.icr.io/meeting-intel/api:latest
docker tag meeting-intel-api:latest us.icr.io/meeting-intel/api:v0.1.0

# Push to IBM Container Registry
docker push us.icr.io/meeting-intel/api:latest
docker push us.icr.io/meeting-intel/api:v0.1.0
```

### Step 4: Deploy to Production

#### Using Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    image: meeting-intel-api:latest
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - LOG_LEVEL=info
    env_file:
      - .env.production
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./exports:/app/exports
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Deploy:**

```bash
# Start the service
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop the service
docker-compose -f docker-compose.prod.yml down
```

#### Using Docker Swarm

```bash
# Initialize swarm (if not already)
docker swarm init

# Create a secret for environment variables
docker secret create meeting_intel_env .env.production

# Deploy the stack
docker stack deploy -c docker-compose.prod.yml meeting-intel

# Check status
docker stack services meeting-intel

# View logs
docker service logs meeting-intel_api

# Remove the stack
docker stack rm meeting-intel
```

## IBM Cloud Code Engine Deployment

IBM Cloud Code Engine is a fully managed, serverless platform that runs containerized workloads.

### Benefits

- **Auto-scaling**: Scales to zero when not in use
- **Managed infrastructure**: No server management
- **Pay-per-use**: Only pay for actual usage
- **Built-in monitoring**: Integrated logging and metrics
- **HTTPS by default**: Automatic SSL/TLS

### Step 1: Install IBM Cloud CLI

```bash
# Install IBM Cloud CLI
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

# Install Code Engine plugin
ibmcloud plugin install code-engine

# Verify installation
ibmcloud ce version
```

### Step 2: Login and Setup

```bash
# Login to IBM Cloud
ibmcloud login --apikey YOUR_API_KEY

# Target a resource group
ibmcloud target -g Default

# Target a region
ibmcloud target -r us-south
```

### Step 3: Create Code Engine Project

```bash
# Create a new project
ibmcloud ce project create --name meeting-intel-prod

# Select the project
ibmcloud ce project select --name meeting-intel-prod

# Verify
ibmcloud ce project current
```

### Step 4: Create Secrets for Environment Variables

```bash
# Create secrets for sensitive data
ibmcloud ce secret create --name cos-credentials \
  --from-literal COS_API_KEY_ID=your-cos-api-key \
  --from-literal COS_INSTANCE_CRN=your-cos-crn

ibmcloud ce secret create --name watsonx-credentials \
  --from-literal WATSONX_AI_APIKEY=your-watsonx-api-key \
  --from-literal WATSONX_AI_PROJECT_ID=your-project-id

# Create configmap for non-sensitive config
ibmcloud ce configmap create --name app-config \
  --from-literal NODE_ENV=production \
  --from-literal PORT=8080 \
  --from-literal LOG_LEVEL=info \
  --from-literal COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud \
  --from-literal COS_BUCKET=meeting-intel-uploads \
  --from-literal WATSONX_AI_SERVICE_URL=https://us-south.ml.cloud.ibm.com \
  --from-literal WATSONX_MODEL_ID=ibm/granite-3-8b-instruct \
  --from-literal WATSONX_API_VERSION=2025-02-11
```

### Step 5: Deploy Application

#### Option A: Deploy from Container Registry

```bash
# Deploy from IBM Container Registry
ibmcloud ce application create \
  --name meeting-intel-api \
  --image us.icr.io/meeting-intel/api:latest \
  --registry-secret icr-secret \
  --port 8080 \
  --min-scale 1 \
  --max-scale 10 \
  --cpu 1 \
  --memory 2G \
  --env-from-secret cos-credentials \
  --env-from-secret watsonx-credentials \
  --env-from-configmap app-config

# Get the application URL
ibmcloud ce application get --name meeting-intel-api
```

#### Option B: Deploy from Source Code

```bash
# Deploy directly from source (Code Engine builds the image)
ibmcloud ce application create \
  --name meeting-intel-api \
  --build-source . \
  --build-context-dir ./api \
  --strategy dockerfile \
  --port 8080 \
  --min-scale 1 \
  --max-scale 10 \
  --cpu 1 \
  --memory 2G \
  --env-from-secret cos-credentials \
  --env-from-secret watsonx-credentials \
  --env-from-configmap app-config
```

### Step 6: Configure Auto-Scaling

```bash
# Update scaling configuration
ibmcloud ce application update \
  --name meeting-intel-api \
  --min-scale 1 \
  --max-scale 20 \
  --scale-down-delay 300 \
  --concurrency 100 \
  --concurrency-target 80
```

**Scaling parameters:**
- `min-scale`: Minimum instances (1 for production, 0 for dev)
- `max-scale`: Maximum instances
- `scale-down-delay`: Seconds before scaling down
- `concurrency`: Max concurrent requests per instance
- `concurrency-target`: Target concurrent requests (triggers scale-up)

### Step 7: Verify Deployment

```bash
# Get application details
ibmcloud ce application get --name meeting-intel-api

# View logs
ibmcloud ce application logs --name meeting-intel-api

# Test the endpoint
curl https://meeting-intel-api.xxx.us-south.codeengine.appdomain.cloud/health
```

### Step 8: Set Up Custom Domain (Optional)

```bash
# Create a custom domain mapping
ibmcloud ce application update \
  --name meeting-intel-api \
  --domain-mapping api.yourdomain.com \
  --tls-secret your-tls-secret

# Verify
ibmcloud ce application get --name meeting-intel-api
```

**Note**: You'll need to:
1. Create a TLS certificate secret
2. Configure DNS CNAME record pointing to Code Engine domain

## Environment Configuration

### Production Environment Variables

Create `.env.production` with production values:

```bash
# IBM Cloud Object Storage
COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud
COS_API_KEY_ID=<production-api-key>
COS_INSTANCE_CRN=<production-instance-crn>
COS_BUCKET=meeting-intel-prod

# IBM watsonx.ai
WATSONX_AI_AUTH_TYPE=iam
WATSONX_AI_APIKEY=<production-api-key>
WATSONX_AI_SERVICE_URL=https://us-south.ml.cloud.ibm.com
WATSONX_AI_PROJECT_ID=<production-project-id>
WATSONX_MODEL_ID=ibm/granite-3-8b-instruct
WATSONX_API_VERSION=2025-02-11

# Application Settings
PORT=8080
NODE_ENV=production
LOG_LEVEL=info

# Security
CORS_ORIGIN=https://yourdomain.com
```

### Environment Variable Management

**Best Practices:**

1. **Never commit secrets to Git**
   ```bash
   # Add to .gitignore
   echo ".env.production" >> .gitignore
   ```

2. **Use secrets management**
   - IBM Cloud Secrets Manager
   - HashiCorp Vault
   - AWS Secrets Manager
   - Azure Key Vault

3. **Rotate credentials regularly**
   - API keys: Every 90 days
   - Passwords: Every 60 days
   - Certificates: Before expiration

4. **Use different credentials per environment**
   - Development
   - Staging
   - Production

## Security Considerations

### 1. API Security

#### Enable HTTPS Only

```javascript
// In production, redirect HTTP to HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

#### Configure CORS Properly

```bash
# Set specific origins in production
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

#### Rate Limiting

Production rate limits are already configured:
- General API: 100 req/15min
- Uploads: 20 req/15min
- Expensive ops: 10 req/15min

Adjust based on your needs in `api/src/middleware/rateLimiter.ts`.

### 2. Data Security

#### Encrypt Data at Rest

- **COS**: Enable encryption in bucket settings
- **Database**: Use encrypted volumes for SQLite file
- **Logs**: Encrypt log files

#### Encrypt Data in Transit

- **HTTPS**: Always use HTTPS in production
- **TLS 1.2+**: Minimum TLS version
- **Strong Ciphers**: Configure secure cipher suites

### 3. Access Control

#### API Authentication (Future)

Plan to implement:
- API key authentication
- JWT tokens
- OAuth 2.0
- IBM Cloud IAM integration

#### Network Security

- **Firewall**: Restrict inbound traffic to necessary ports
- **VPC**: Deploy in private network (IBM Cloud VPC)
- **Security Groups**: Configure security group rules

### 4. Secrets Management

#### IBM Cloud Secrets Manager

```bash
# Create a secret
ibmcloud secrets-manager secret-create \
  --secret-type arbitrary \
  --name watsonx-api-key \
  --secret-data '{"apikey":"your-key-here"}'

# Retrieve a secret
ibmcloud secrets-manager secret-get \
  --secret-type arbitrary \
  --id <secret-id>
```

#### Environment Variable Injection

```bash
# In Code Engine, reference secrets
ibmcloud ce application update \
  --name meeting-intel-api \
  --env-from-secret watsonx-credentials
```

## Monitoring and Logging

### 1. Application Logging

The application uses Pino for structured JSON logging.

**Log Levels:**
- `error`: Critical errors requiring immediate attention
- `warn`: Warning conditions
- `info`: Informational messages (default in production)
- `debug`: Detailed debugging information
- `trace`: Very detailed tracing

**Configure log level:**
```bash
LOG_LEVEL=info  # Production
LOG_LEVEL=debug # Troubleshooting
```

### 2. IBM Cloud Logging

#### Enable Logging in Code Engine

```bash
# Logs are automatically sent to IBM Log Analysis
# View logs in IBM Cloud Console → Logging

# Or use CLI
ibmcloud ce application logs --name meeting-intel-api --follow
```

#### Set Up Log Analysis

1. Create IBM Log Analysis instance
2. Configure Code Engine to send logs
3. Create dashboards and alerts

### 3. Monitoring Metrics

#### Health Check Endpoint

```bash
# Monitor health endpoint
curl https://your-app-url/health

# Expected response
{
  "ok": true,
  "timestamp": "2026-02-03T06:50:00.000Z",
  "env": "production",
  "version": "0.1.0"
}
```

#### Key Metrics to Monitor

- **Request Rate**: Requests per second
- **Response Time**: Average, p95, p99
- **Error Rate**: 4xx and 5xx responses
- **CPU Usage**: Percentage
- **Memory Usage**: MB used
- **Database Size**: Growth over time
- **COS Storage**: Objects and size

#### IBM Cloud Monitoring

```bash
# Create IBM Cloud Monitoring instance
ibmcloud resource service-instance-create \
  meeting-intel-monitoring \
  sysdig-monitor \
  graduated-tier \
  us-south

# Configure Code Engine to send metrics
ibmcloud ce application update \
  --name meeting-intel-api \
  --service-binding monitoring
```

### 4. Alerting

Set up alerts for:

- **High Error Rate**: > 5% of requests
- **Slow Response Time**: p95 > 2 seconds
- **High CPU Usage**: > 80% for 5 minutes
- **High Memory Usage**: > 90% for 5 minutes
- **Service Down**: Health check fails
- **Rate Limit Exceeded**: Frequent 429 responses

#### Example Alert Configuration

```yaml
# IBM Cloud Monitoring alert
alert:
  name: "High Error Rate"
  condition: "error_rate > 5%"
  duration: "5m"
  notification:
    - email: ops@yourdomain.com
    - slack: "#alerts"
```

## Scaling Recommendations

### Vertical Scaling (Resource Allocation)

#### Small Workload (< 100 meetings/day)
```bash
--cpu 0.5 --memory 1G --min-scale 1 --max-scale 3
```

#### Medium Workload (100-1000 meetings/day)
```bash
--cpu 1 --memory 2G --min-scale 2 --max-scale 10
```

#### Large Workload (> 1000 meetings/day)
```bash
--cpu 2 --memory 4G --min-scale 5 --max-scale 20
```

### Horizontal Scaling (Instance Count)

Code Engine auto-scales based on:
- **Concurrent requests**: Target 80% of max concurrency
- **CPU usage**: Scale up at 70% CPU
- **Memory usage**: Scale up at 80% memory

**Optimize scaling:**

```bash
# Fast scale-up, slow scale-down
ibmcloud ce application update \
  --name meeting-intel-api \
  --scale-down-delay 600 \
  --concurrency-target 70
```

### Database Scaling

**SQLite Limitations:**
- Single-writer limitation
- Not suitable for high-concurrency writes
- File-based, not distributed

**Migration Path:**
1. **PostgreSQL**: For moderate scale (< 10k meetings)
2. **IBM Db2**: For enterprise scale
3. **Sharding**: For very large scale

### Caching Strategy

Implement caching for frequently accessed data:

```javascript
// Example: Redis cache
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache insights for 5 minutes
async function getCachedInsights() {
  const cached = await redis.get('insights:summary');
  if (cached) return JSON.parse(cached);
  
  const insights = await computeInsights();
  await redis.setex('insights:summary', 300, JSON.stringify(insights));
  return insights;
}
```

## Backup and Recovery

### 1. Database Backup

#### Automated Backup Script

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_FILE="/app/data/meeting.db"

# Create backup
sqlite3 $DB_FILE ".backup $BACKUP_DIR/meeting_$DATE.db"

# Compress
gzip $BACKUP_DIR/meeting_$DATE.db

# Upload to COS
ibmcloud cos object-put \
  --bucket meeting-intel-backups \
  --key backups/meeting_$DATE.db.gz \
  --body $BACKUP_DIR/meeting_$DATE.db.gz

# Clean up old local backups (keep last 7 days)
find $BACKUP_DIR -name "meeting_*.db.gz" -mtime +7 -delete

echo "Backup completed: meeting_$DATE.db.gz"
```

#### Schedule with Cron

```bash
# Add to crontab
0 2 * * * /app/scripts/backup-db.sh >> /app/logs/backup.log 2>&1
```

### 2. COS Backup

IBM Cloud Object Storage has built-in:
- **Versioning**: Keep multiple versions of objects
- **Replication**: Cross-region replication
- **Lifecycle**: Automatic archival to cheaper storage

**Enable versioning:**

```bash
ibmcloud cos bucket-versioning-put \
  --bucket meeting-intel-uploads \
  --versioning-configuration Status=Enabled
```

### 3. Disaster Recovery Plan

#### Recovery Time Objective (RTO)

Target: **< 1 hour**

#### Recovery Point Objective (RPO)

Target: **< 24 hours** (daily backups)

#### Recovery Procedure

1. **Restore Database**
   ```bash
   # Download latest backup
   ibmcloud cos object-get \
     --bucket meeting-intel-backups \
     --key backups/meeting_latest.db.gz \
     --output meeting.db.gz
   
   # Decompress
   gunzip meeting.db.gz
   
   # Restore
   cp meeting.db /app/data/meeting.db
   ```

2. **Redeploy Application**
   ```bash
   # Redeploy to Code Engine
   ibmcloud ce application update \
     --name meeting-intel-api \
     --image us.icr.io/meeting-intel/api:latest
   ```

3. **Verify Recovery**
   ```bash
   # Test health endpoint
   curl https://your-app-url/health
   
   # Test data retrieval
   curl https://your-app-url/insights/summary
   ```

## Troubleshooting Production Issues

### Common Production Issues

#### Issue: Application Not Starting

**Symptoms:**
- Health check fails
- Container restarts repeatedly
- Error logs show startup failures

**Diagnosis:**
```bash
# Check logs
ibmcloud ce application logs --name meeting-intel-api --tail 100

# Check events
ibmcloud ce application events --name meeting-intel-api
```

**Solutions:**
1. Verify environment variables are set correctly
2. Check database file permissions
3. Ensure IBM service credentials are valid
4. Review startup logs for specific errors

#### Issue: High Memory Usage

**Symptoms:**
- Application crashes with OOM errors
- Slow response times
- Frequent restarts

**Diagnosis:**
```bash
# Check memory usage
ibmcloud ce application get --name meeting-intel-api

# Review logs for memory errors
ibmcloud ce application logs --name meeting-intel-api | grep "memory"
```

**Solutions:**
1. Increase memory allocation
2. Implement pagination for large queries
3. Add caching layer
4. Optimize database queries

#### Issue: Slow API Responses

**Symptoms:**
- Response times > 2 seconds
- Timeout errors
- User complaints

**Diagnosis:**
```bash
# Check response times in logs
ibmcloud ce application logs --name meeting-intel-api | grep "response_time"

# Monitor metrics
ibmcloud monitoring metric-query \
  --metric http_response_time \
  --start -1h
```

**Solutions:**
1. Add database indexes
2. Implement caching
3. Optimize watsonx.ai calls
4. Scale up resources

#### Issue: Rate Limit Exceeded

**Symptoms:**
- 429 Too Many Requests errors
- Users unable to access API

**Diagnosis:**
```bash
# Check rate limit logs
ibmcloud ce application logs --name meeting-intel-api | grep "RATE_LIMIT"
```

**Solutions:**
1. Increase rate limits if legitimate traffic
2. Implement API key authentication
3. Add request queuing
4. Scale horizontally

### Emergency Procedures

#### Rollback Deployment

```bash
# Rollback to previous version
ibmcloud ce application update \
  --name meeting-intel-api \
  --image us.icr.io/meeting-intel/api:v0.0.9

# Verify
ibmcloud ce application get --name meeting-intel-api
```

#### Scale Down (Emergency)

```bash
# Reduce load temporarily
ibmcloud ce application update \
  --name meeting-intel-api \
  --max-scale 2 \
  --concurrency 50
```

#### Enable Debug Logging

```bash
# Temporarily enable debug logging
ibmcloud ce application update \
  --name meeting-intel-api \
  --env LOG_LEVEL=debug

# Remember to revert after troubleshooting
ibmcloud ce application update \
  --name meeting-intel-api \
  --env LOG_LEVEL=info
```

## Maintenance Windows

### Planned Maintenance

Schedule regular maintenance windows for:
- **Security updates**: Monthly
- **Dependency updates**: Quarterly
- **Database optimization**: Monthly
- **Backup verification**: Weekly

### Zero-Downtime Deployment

Code Engine supports zero-downtime deployments:

```bash
# Deploy new version gradually
ibmcloud ce application update \
  --name meeting-intel-api \
  --image us.icr.io/meeting-intel/api:v0.2.0 \
  --revision-name v0-2-0

# Traffic splitting (optional)
ibmcloud ce application update \
  --name meeting-intel-api \
  --traffic v0-1-0=50,v0-2-0=50

# Full cutover after validation
ibmcloud ce application update \
  --name meeting-intel-api \
  --traffic v0-2-0=100
```

## Cost Optimization

### Code Engine Pricing

- **vCPU**: $0.04 per vCPU-hour
- **Memory**: $0.004 per GB-hour
- **Requests**: First 100k free, then $0.40 per million

### Optimization Tips

1. **Scale to zero** for dev/test environments
2. **Right-size resources** based on actual usage
3. **Use caching** to reduce compute time
4. **Optimize images** to reduce startup time
5. **Monitor costs** regularly

```bash
# View cost estimates
ibmcloud ce application get --name meeting-intel-api --output json | \
  jq '.status.resourceUsage'
```

## Additional Resources

- **IBM Cloud Code Engine Docs**: [cloud.ibm.com/docs/codeengine](https://cloud.ibm.com/docs/codeengine)
- **Docker Best Practices**: [docs.docker.com/develop/dev-best-practices](https://docs.docker.com/develop/dev-best-practices/)
- **Node.js Production Best Practices**: [nodejs.org/en/docs/guides](https://nodejs.org/en/docs/guides/)
- **IBM Cloud Status**: [cloud.ibm.com/status](https://cloud.ibm.com/status)

---

**Last Updated**: 2026-02-03  
**Version**: 0.1.0  
**Maintainer**: DevOps Team