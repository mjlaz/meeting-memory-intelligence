
# Bob Task - Architecture (Seeded)

## Diagram (ASCII)
```
Web UI -> Express API -> COS (uploads/)
                     -> watsonx.ai (extraction)
                     -> SQLite (facts)
                     -> Exports (CSV/JSON)
MCP Filesystem -> reads/writes ./exports and ./.bob
```

## Components
- API (Node/TS) - routes: /ingest, /process, /insights, /export
- COS - S3-compatible bucket for artifacts
- watsonx.ai - text generation/extraction using Granite
- DB - SQLite repo layer; swap to Db2 later
- MCP - Filesystem server for tool-based exports

## Config
- .env: COS endpoint/apikey/instance CRN/bucket; watsonx.ai URL/API key/Project ID/Model ID/API version

## Security
- No secrets in code; limit logs; MIME & size validation; least privilege on COS

## Observability
- Pino logs; simple health endpoint /health

## Trade-offs
- SQLite for speed (hackathon) over Db2; single-service over microservices
