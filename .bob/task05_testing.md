
# Bob Task - Testing & QA (Seeded)

## Unit Tests
- validators: JSON extraction & schema (zod)
- repo: actions/decisions/risks insert/select

## Integration Tests
- POST /process with small transcript -> expect structured facts

## Manual Checks
- Upload flow to COS; CSV/JSON exports; MCP file appears under exports/

## Coverage Goal
- Minimum: critical paths; stretch: 70%+
