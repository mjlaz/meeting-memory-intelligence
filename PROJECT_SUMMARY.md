
# Project Summary

## Problem
Teams lose track of action items, owners, and decisions across recurring meetings.

## Solution
Meeting Memory Intelligence Engine: converts artifacts into structured actions/decisions/risks + cross-meeting insights.

## Architecture
- COS for raw artifacts
- watsonx.ai for extraction
- SQLite for facts (swap to Db2 later)
- MCP Filesystem server to export reports and capture tool usage
