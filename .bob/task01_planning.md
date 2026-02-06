
# Bob Task - Planning (Seeded)

**Timestamp (UTC):** 2026-02-02 06:00:12Z
**Team:** ${TEAM_NAME:-Your Team}
**Lead:** ${LEADER_NAME:-Your Name}

## Executive Summary
Build Meeting Memory Intelligence Engine - converts messy meeting artifacts into actionable intelligence and a cross-meeting memory timeline.

## Problem Statement
Teams forget decisions and lose action items across recurring meetings.

## Target Users
- Delivery managers and team leads
- Project coordinators and scrum masters

## Objectives & Success Criteria
- Extract actions/decisions/risks with >80% accuracy on internal test set
- Create owner workload and risk views across 4+ meetings
- End-to-end processing in < 10 seconds for a 5-10 page transcript

## Scope
- IN: TXT/MD/Doc text, basic web UI, CSV/JSON exports, IBM COS, watsonx.ai, MCP filesystem
- OUT: Enterprise auth/SSO, advanced audio transcription (future)

## IBM Integration (Planned)
- COS for raw artifact storage (S3-compatible)
- watsonx.ai for extraction (model: ${WATSONX_MODEL:-ibm/granite-3-8b-instruct})

## MCP Usage (Planned)
- Filesystem MCP to write exports to ./exports and capture tool usage evidence in ./.bob

## Risks & Mitigations
- LLM JSON drift: validate with zod + JSON-only prompt
- Secrets exposure: .env, do not commit, redact logs

## Milestones
- Day 1: Scaffolding + COS upload
- Day 2: watsonx.ai extraction + insights + tests
- Day 3: MCP, docs, video
