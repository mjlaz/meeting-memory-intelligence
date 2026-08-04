# Meeting Memory Intelligence Engine

Transform meeting artifacts into structured, actionable intelligence using IBM watsonx.ai.

Built for the IBM APAC Bob-a-thon 2026 — placed 1st among Philippine entries (26th of 60 region-wide).

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![IBM watsonx.ai](https://img.shields.io/badge/IBM-watsonx.ai-blue)

---

## Overview

A prototype system that turns unstructured meeting content — transcripts and documents — into
structured actions, decisions, and risks, with cross-meeting analytics on top.

**Problem:** Teams lose track of action items, owners, and decisions across recurring meetings.

**Approach:** Ingest meeting artifacts, extract structured facts with an LLM, store them, and
surface them through timeline, owner-workload, and risk views.

> **Project status:** This is a hackathon prototype, not a production system. It was built in a
> short timeframe with AI assistance (see [Development notes](#development-notes)); the
> architecture, data model, and extraction design decisions are my own.

## What it does

- **Ingestion** of text and document artifacts (audio transcription via Watson STT is planned, not yet wired up)
- **AI extraction** using IBM watsonx.ai (Granite 3 8B Instruct), returning actions, decisions,
  and risks with confidence scores
- **Structured storage** — raw artifacts in IBM Cloud Object Storage, structured facts in SQLite
- **Cross-meeting analytics** — decision timeline, owner workload, risk tracking
- **Export** to CSV and JSON

## Architecture
Client / Web UI
│
Express API (TypeScript)
│
Security & validation middleware
│
Service layer ── IBM watsonx.ai (extraction)
├──────── IBM Cloud Object Storage (artifacts)
└──────── SQLite (structured facts)

The extraction service wraps watsonx.ai with a multi-stage JSON-parsing fallback, so malformed
model output is recovered rather than dropped — the main reliability problem when using an LLM
for structured extraction.

## Technology stack

- **Runtime:** Node.js, Express, TypeScript
- **AI:** IBM watsonx.ai (Granite 3 8B Instruct)
- **Storage:** IBM Cloud Object Storage; SQLite (via better-sqlite3)
- **Validation:** Zod
- **Logging:** Pino
- **Testing:** Jest

## Getting started

### Prerequisites

- Node.js 20+
- An IBM Cloud account with watsonx.ai and Cloud Object Storage configured

### Setup

```bash
git clone https://github.com/mjlaz/meeting-memory-intelligence.git
cd meeting-memory-intelligence/api
npm install
cp .env.example .env      # add your IBM Cloud credentials
npm run dev
```

The app runs at http://localhost:8080.

## API

Core endpoints:

| Endpoint             | Method | Description                   |
| -------------------- | ------ | ----------------------------- |
| `/health`            | GET    | Health check                  |
| `/ingest`            | POST   | Upload meeting artifacts      |
| `/process`           | POST   | Extract facts from transcript |
| `/insights/timeline` | GET    | Decision timeline             |
| `/insights/owners`   | GET    | Action items by owner         |
| `/insights/risks`    | GET    | Risk analysis                 |
| `/insights/summary`  | GET    | Summary statistics            |
| `/export/csv/actions`| GET    | Export actions as CSV         |
| `/export/json/facts` | GET    | Export all facts as JSON      |
| `/meetings`          | GET/POST | Manage meetings             |

## Testing

```bash
cd api
npm test
```

46 of 48 tests passing (2 skipped), covering the middleware, extraction parsing, and analytics paths.

## Development notes

This project was built for a hackathon with heavy use of an AI coding assistant. I used it to
move fast on boilerplate — middleware, CRUD, test scaffolding, and documentation — while I owned
the design decisions: the actions/decisions/risks extraction schema with confidence scoring, the
choice of Granite 3 8B, the multi-stage JSON-parsing fallback for handling malformed model
output, and the overall service structure. The AI accelerated implementation; the engineering
judgment about *what* to build and *why* was mine.

## License

MIT — see [LICENSE](LICENSE).
