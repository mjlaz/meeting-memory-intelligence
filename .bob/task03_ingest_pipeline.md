
# Bob Task - Ingest Pipeline (Seeded)

## Accepted File Types
- .txt, .md, simple .docx/.pdf (via manual copy-paste for MVP), images/audio optional later

## Validation
- Max 10 files per request; memory-based upload (multer); MIME checks

## Storage Strategy (COS)
- Key format: uploads/<epoch>_<original>
- Metadata: Content-Type; store originals only (immutable)

## Normalization
- Single transcript text per process request; merge notes if needed

## Errors
- Return structured 4xx/5xx; never expose stack traces to users
