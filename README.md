# Meeting Memory Intelligence Engine

> Transform meeting artifacts into actionable intelligence with AI-powered extraction and cross-meeting analytics.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![IBM watsonx.ai](https://img.shields.io/badge/IBM-watsonx.ai-blue)](https://www.ibm.com/watsonx)

## 🎯 Overview

The Meeting Memory Intelligence Engine is a sophisticated system that converts mixed meeting artifacts (audio recordings, transcripts, slides, notes, chat logs) into structured, actionable intelligence. It extracts action items, decisions, and risks while providing powerful cross-meeting analytics and insights.

### Key Features

- **🎤 Multi-Format Ingestion**: Upload audio (MP3, WAV, M4A), documents (PDF, DOCX), and text files
- **🤖 AI-Powered Extraction**: Uses IBM watsonx.ai (Granite 3 8B Instruct) for intelligent fact extraction
- **📊 Structured Data**: Automatically extracts actions, decisions, and risks with confidence scores
- **🔍 Cross-Meeting Analytics**: Timeline views, owner workload analysis, and risk tracking
- **📈 Insights Dashboard**: Real-time statistics and trends across all meetings
- **💾 Flexible Storage**: IBM Cloud Object Storage for artifacts, SQLite for structured data
- **📤 Export Capabilities**: CSV and JSON exports for integration with external systems
- **🔒 Enterprise Security**: Rate limiting, CORS, security headers, and input sanitization
- **🚀 Production Ready**: Docker support, IBM Cloud Code Engine deployment
- **🧪 Comprehensive Testing**: Unit, integration, and E2E tests with Jest

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Features](#-features)
- [Architecture](#-architecture)
- [Documentation](#-documentation)
- [Technology Stack](#-technology-stack)
- [Use Cases](#-use-cases)
- [API Endpoints](#-api-endpoints)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **IBM Cloud Account** ([Sign up](https://cloud.ibm.com/))
- **IBM watsonx.ai** project configured
- **IBM Cloud Object Storage** instance created

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd meeting-memory-intel-regenerated

# Install dependencies
cd api
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your IBM Cloud credentials

# Run the application
npm run dev
```

The application will be available at:
- **Landing Page**: http://localhost:8080 or http://localhost:8080/index.html (Learn about the tool)
- **Application Dashboard**: http://localhost:8080/dashboard.html (Use the tool)

### First Steps

1. **Upload a meeting artifact**:
   ```bash
   curl -X POST http://localhost:8080/ingest \
     -F "files=@meeting-notes.txt"
   ```

2. **Process a transcript**:
   ```bash
   curl -X POST http://localhost:8080/process \
     -H "Content-Type: application/json" \
     -d '{
       "transcriptText": "John will complete the API documentation by Friday. We decided to use PostgreSQL for production.",
       "meetingType": "planning"
     }'
   ```

3. **View insights**:
   ```bash
   curl http://localhost:8080/insights/summary
   ```

4. **Access the web interface**:
   Open `http://localhost:8080` in your browser

## ✨ Features

### Intelligent Extraction

- **Action Items**: Automatically identifies tasks with owners, descriptions, due dates, and confidence scores
- **Decisions**: Captures decisions with rationale, dates, and impact levels
- **Risks**: Detects potential issues with severity levels and mitigation plans
- **Meeting Types**: Specialized extraction for standups, planning, retrospectives, and client meetings

### Analytics & Insights

- **Decision Timeline**: Chronological view of all decisions across meetings
- **Owner Workload**: Track action items by owner with confidence metrics
- **Risk Dashboard**: Monitor risks by severity with status tracking
- **Summary Statistics**: Real-time counts and trends

### Data Management

- **Flexible Storage**: Raw artifacts in IBM COS, structured data in SQLite
- **Meeting Management**: Full CRUD operations for meetings, speakers, and transcripts
- **Export Options**: CSV and JSON exports for external integrations
- **Search & Filter**: Query by date, type, owner, and more

### Enterprise Features

- **Security**: Rate limiting, CORS, security headers, input sanitization
- **Monitoring**: Structured logging with Pino, health checks
- **Scalability**: Auto-scaling with IBM Cloud Code Engine
- **Reliability**: Retry logic, error handling, graceful degradation

## 🏗️ Architecture

```mermaid
graph TB
    Client[Client/Web UI] --> API[Express API Server]
    API --> Middleware[Security & Validation]
    Middleware --> Routes[Route Handlers]
    Routes --> Services[Service Layer]
    Services --> COS[IBM Cloud Object Storage]
    Services --> WX[IBM watsonx.ai]
    Services --> DB[(SQLite Database)]
    
    style Client fill:#e1f5ff
    style API fill:#fff3e0
    style Services fill:#e8f5e9
    style COS fill:#e3f2fd
    style WX fill:#e3f2fd
    style DB fill:#fce4ec
```

### System Components

- **API Server**: Express.js with TypeScript, comprehensive middleware
- **Service Layer**: Modular services for COS, watsonx.ai, NLP, analytics
- **Database**: SQLite with better-sqlite3 (production: PostgreSQL/Db2)
- **IBM Services**: watsonx.ai for AI, COS for storage, Watson STT (coming soon)

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📚 Documentation

Comprehensive documentation is available:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, components, data flow, and technology stack
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference with examples
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Step-by-step setup instructions for local development
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Production deployment with Docker and IBM Cloud
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Testing documentation and best practices
- **[SECURITY.md](./SECURITY.md)** - Security policies and vulnerability reporting

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.19+
- **Language**: TypeScript 5.6+
- **Database**: SQLite (better-sqlite3)
- **Validation**: Zod 3.23+
- **Logging**: Pino 9.2+

### IBM Cloud Services

- **watsonx.ai**: AI/ML model for fact extraction (Granite 3 8B Instruct)
- **Cloud Object Storage**: S3-compatible storage for meeting artifacts
- **Watson Speech-to-Text**: Audio transcription (coming soon)

### Development & Testing

- **Build**: TypeScript Compiler
- **Dev Server**: tsx with hot reload
- **Testing**: Jest 29+ with ts-jest
- **Container**: Docker with multi-stage builds

## 💼 Use Cases

### 1. Agile Teams

- **Daily Standups**: Track blockers and action items automatically
- **Sprint Planning**: Capture decisions and commitments
- **Retrospectives**: Document improvements and action items

### 2. Client Meetings

- **Requirements Gathering**: Extract decisions and next steps
- **Status Updates**: Track commitments and risks
- **Stakeholder Reviews**: Document feedback and action items

### 3. Executive Meetings

- **Strategic Planning**: Capture high-level decisions
- **Board Meetings**: Document resolutions and action items
- **Risk Management**: Track and monitor organizational risks

### 4. Project Management

- **Kickoff Meetings**: Extract project goals and milestones
- **Status Reviews**: Track progress and blockers
- **Post-Mortems**: Document lessons learned

## 🔌 API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ingest` | POST | Upload meeting artifacts |
| `/transcribe` | POST | Transcribe audio files |
| `/process` | POST | Extract facts from transcript |
| `/insights/timeline` | GET | Decision timeline |
| `/insights/owners` | GET | Action items by owner |
| `/insights/risks` | GET | Risk analysis |
| `/insights/summary` | GET | Summary statistics |
| `/export/csv/actions` | GET | Export actions as CSV |
| `/export/json/facts` | GET | Export all facts as JSON |
| `/meetings` | GET/POST | Manage meetings |
| `/meetings/:id` | GET/PUT/DELETE | Meeting operations |

For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## 👨‍💻 Development

### Setup Development Environment

```bash
# Install dependencies
cd api
npm install

# Run in development mode (with hot reload)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Build for production
npm run build

# Run production build
npm start
```

### Project Structure

```
meeting-memory-intel-regenerated/
├── api/                      # Backend API
│   ├── src/
│   │   ├── index.ts         # Application entry point
│   │   ├── db/              # Database layer
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   └── utils/           # Utility functions
│   ├── test/                # Test files
│   ├── data/                # SQLite database
│   ├── logs/                # Application logs
│   ├── exports/             # Generated exports
│   ├── Dockerfile           # Docker configuration
│   └── package.json         # Dependencies
├── web/                     # Web interface
│   └── index.html          # Frontend UI
├── mcp/                     # MCP configuration
├── docs/                    # Documentation
└── README.md               # This file
```

### Code Quality

```bash
# Type checking
npx tsc --noEmit

# Run linter (if configured)
npm run lint

# Format code (if configured)
npm run format
```

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# IBM Cloud Object Storage
COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud
COS_API_KEY_ID=your-api-key
COS_INSTANCE_CRN=your-instance-crn
COS_BUCKET=meeting-intel-uploads

# IBM watsonx.ai
WATSONX_AI_APIKEY=your-api-key
WATSONX_AI_SERVICE_URL=https://us-south.ml.cloud.ibm.com
WATSONX_AI_PROJECT_ID=your-project-id
WATSONX_MODEL_ID=ibm/granite-3-8b-instruct

# Application
PORT=8080
NODE_ENV=development
LOG_LEVEL=info
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build Docker image
cd api
docker build -t meeting-intel-api:latest .

# Run container
docker run -d \
  --name meeting-intel \
  -p 8080:8080 \
  --env-file .env \
  meeting-intel-api:latest
```

### IBM Cloud Code Engine

```bash
# Install IBM Cloud CLI
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

# Login and deploy
ibmcloud login --apikey YOUR_API_KEY
ibmcloud ce project create --name meeting-intel-prod
ibmcloud ce application create \
  --name meeting-intel-api \
  --image us.icr.io/meeting-intel/api:latest \
  --port 8080 \
  --min-scale 1 \
  --max-scale 10
```

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Write tests**: Ensure all tests pass
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow TypeScript best practices
- **Testing**: Write tests for new features (aim for >80% coverage)
- **Documentation**: Update relevant documentation
- **Commits**: Use clear, descriptive commit messages
- **Pull Requests**: Provide detailed description of changes

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🧪 Additional tests
- 🎨 UI/UX enhancements
- 🌐 Internationalization
- ⚡ Performance optimizations

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Meeting Memory Intelligence Engine Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📞 Support

### Getting Help

- **Documentation**: Check the [documentation](#-documentation) first
- **Issues**: [GitHub Issues](https://github.com/your-org/meeting-memory-intel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/meeting-memory-intel/discussions)
- **Email**: support@yourdomain.com

### Reporting Issues

When reporting issues, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the problem
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: OS, Node.js version, etc.
6. **Logs**: Relevant log output (sanitize sensitive data)

### Security Vulnerabilities

**Do not report security vulnerabilities through public GitHub issues.**

Please report security vulnerabilities to: security@yourdomain.com

See [SECURITY.md](./SECURITY.md) for more information.

## 🎯 Roadmap

### Current Version (v0.1.0)

- ✅ Core API functionality
- ✅ IBM watsonx.ai integration
- ✅ IBM Cloud Object Storage integration
- ✅ Meeting management
- ✅ Fact extraction (actions, decisions, risks)
- ✅ Analytics and insights
- ✅ Export capabilities
- ✅ Docker support

### Upcoming Features (v0.2.0)

- 🔄 IBM Watson Speech-to-Text integration
- 🔄 Real-time transcription
- 🔄 Speaker diarization
- 🔄 Enhanced analytics dashboard
- 🔄 API authentication
- 🔄 Webhook support

### Future Enhancements (v1.0.0)

- 📅 Calendar integration (Google, Outlook)
- 🔗 External system integrations (Jira, Asana, Salesforce)
- 🤖 IBM RPA integration for automated workflows
- 📊 Advanced reporting and visualizations
- 🌐 Multi-language support
- 🔍 Full-text search
- 📱 Mobile app

## 🙏 Acknowledgments

- **IBM watsonx.ai** - For powerful AI capabilities
- **IBM Cloud** - For reliable cloud infrastructure
- **Open Source Community** - For amazing tools and libraries
- **Contributors** - For making this project better

## 📊 Project Stats

- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: SQLite
- **Tests**: Jest
- **Code Coverage**: >80%
- **API Endpoints**: 20+
- **Documentation Pages**: 6

## 🔗 Links

- **Documentation**: [Full Documentation](./ARCHITECTURE.md)
- **API Reference**: [API Documentation](./API_DOCUMENTATION.md)
- **Setup Guide**: [Setup Instructions](./SETUP_GUIDE.md)
- **Deployment**: [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- **Testing**: [Testing Guide](./TESTING_GUIDE.md)
- **IBM watsonx.ai**: [watsonx.ai Documentation](https://www.ibm.com/docs/watsonx)
- **IBM Cloud**: [IBM Cloud Documentation](https://cloud.ibm.com/docs)

---

**Built with ❤️ using IBM watsonx.ai and IBM Cloud**

**Version**: 0.1.0  
**Last Updated**: 2026-02-03  
**Status**: Active Development
