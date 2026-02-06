
// v1 Prompt (baseline)
export const FACTS_PROMPT_V1 = `
You are an operations analyst. From the FULL TRANSCRIPT, extract:
- ACTIONS: {owner, description, due_date (ISO if present), confidence 0..1}
- DECISIONS: {summary, rationale, date (ISO if present)}
- RISKS: {summary, severity(low|med|high), owner_if_any}

Return STRICT JSON with keys: actions, decisions, risks. No commentary.
`;

// v2 Prompt (enhanced with strict JSON enforcement)
export const FACTS_PROMPT_V2 = `You are a JSON extraction system. Your ONLY task is to output valid JSON.

Extract from the transcript below and return ONLY this JSON structure (no other text):

{
  "actions": [{"owner": "name", "description": "task", "due_date": null, "confidence": 0.8}],
  "decisions": [{"summary": "decision", "rationale": null, "date": null}],
  "risks": [{"summary": "risk", "severity": "low", "owner_if_any": null}]
}

RULES:
1. Start your response with { and end with }
2. No explanations, no prose, no markdown
3. Use null for missing values
4. Empty arrays [] if no items found
5. Severity: "low", "med", or "high" only
6. Confidence: 0.0 to 1.0

Return ONLY the JSON object.`;

// Default prompt (use v2)
export const FACTS_PROMPT = FACTS_PROMPT_V2;

// Prompt for different meeting types
export const MEETING_TYPE_PROMPTS = {
  standup: `You are analyzing a daily standup meeting. Focus on:
- Action items and blockers
- Quick decisions made
- Risks or impediments mentioned

${FACTS_PROMPT_V2}`,

  planning: `You are analyzing a planning or strategy meeting. Focus on:
- Strategic decisions and their rationale
- Action items with clear owners and deadlines
- Risks to project success

${FACTS_PROMPT_V2}`,

  retrospective: `You are analyzing a retrospective meeting. Focus on:
- Action items for improvement
- Decisions about process changes
- Risks or concerns raised by the team

${FACTS_PROMPT_V2}`,

  client: `You are analyzing a client meeting. Focus on:
- Client requests and commitments
- Decisions requiring client approval
- Risks to client satisfaction or project delivery

${FACTS_PROMPT_V2}`,
};

// Get prompt by meeting type
export function getPromptForMeetingType(type?: string): string {
  if (!type) return FACTS_PROMPT;
  return MEETING_TYPE_PROMPTS[type as keyof typeof MEETING_TYPE_PROMPTS] || FACTS_PROMPT;
}
