
# Bob Task - Prompt Engineering (Seeded)

**Model:** ${WATSONX_MODEL:-ibm/granite-3-8b-instruct}

## v1 (baseline)
```
You are an operations analyst. From the FULL TRANSCRIPT, extract:
- ACTIONS: {owner, description, due_date (ISO if present), confidence 0..1}
- DECISIONS: {summary, rationale, date (ISO if present)}
- RISKS: {summary, severity(low|med|high), owner_if_any}

Return STRICT JSON with keys: actions, decisions, risks. No commentary.
```

### Observed
- Sometimes adds commentary -> solve with JSON-only constraint and post-validator

## v2 (JSON enforcement)
Add: "Output must be valid JSON, no prose, no code fences."

## Parameters
- max_new_tokens: 600-800, temperature: 0.2

## Test Snippet
```
Alice: Bob to deliver slide deck by Friday. Carol approved switching vendor.
Risk: bandwidth on data migration.
```

## Expected JSON
```json
{
  "actions": [{"owner": "Bob", "description": "deliver slide deck", "due_date": "2026-02-06", "confidence": 0.9}],
  "decisions": [{"summary": "switch vendor", "rationale": "approved by Carol", "date": null}],
  "risks": [{"summary": "bandwidth on data migration", "severity": "med", "owner_if_any": null}]
}
```
