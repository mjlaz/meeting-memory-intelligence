
import { z } from 'zod';

// Enhanced schema with better validation
export const Action = z.object({
  owner: z.string().min(1, 'Owner cannot be empty'),
  description: z.string().min(1, 'Description cannot be empty'),
  due_date: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional().default(0.8),
});

export const Decision = z.object({
  summary: z.string().min(1, 'Summary cannot be empty'),
  rationale: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
});

export const Risk = z.object({
  summary: z.string().min(1, 'Summary cannot be empty'),
  severity: z.enum(['low', 'med', 'high']),
  owner_if_any: z.string().nullable().optional(),
});

export const Facts = z.object({
  actions: z.array(Action).default([]),
  decisions: z.array(Decision).default([]),
  risks: z.array(Risk).default([]),
});

export type FactsType = z.infer<typeof Facts>;
export type ActionType = z.infer<typeof Action>;
export type DecisionType = z.infer<typeof Decision>;
export type RiskType = z.infer<typeof Risk>;

/**
 * Parse JSON from model output with multiple fallback strategies
 */
export function parseFactsJson(modelOutput: any): FactsType {
  let text = typeof modelOutput === 'string' ? modelOutput : JSON.stringify(modelOutput);
  
  // Handle case where modelOutput is an object with generated_text property
  if (typeof modelOutput === 'object' && modelOutput.generated_text) {
    text = modelOutput.generated_text;
  }
  
  // Strategy 1: Try to find JSON block with code fences
  let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[1]);
      console.log('✓ Parsed with Strategy 1 (code fences)');
      return Facts.parse(obj);
    } catch (e) {
      console.log('✗ Strategy 1 failed:', (e as Error).message);
    }
  }

  // Strategy 2: Find the largest valid JSON object in the text
  // This handles cases where there's text before/after the JSON
  const allBraces: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') allBraces.push(i);
  }
  
  // Try each opening brace, starting from the first one
  for (const startIdx of allBraces) {
    let braceCount = 0;
    let endIdx = -1;
    
    for (let i = startIdx; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIdx = i;
          break;
        }
      }
    }
    
    if (endIdx !== -1) {
      try {
        const jsonStr = text.substring(startIdx, endIdx + 1);
        const obj = JSON.parse(jsonStr);
        return Facts.parse(obj);
      } catch (e) {
        // Try next opening brace
        continue;
      }
    }
  }

  // Strategy 3: Try to clean up common issues
  try {
    // Remove any leading/trailing text
    text = text.trim();
    
    // Remove markdown code fences if present
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any text before first { and after last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
    }
    
    // Try to parse
    const obj = JSON.parse(text);
    return Facts.parse(obj);
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 4: Try to fix common JSON issues
  try {
    // Replace single quotes with double quotes
    text = text.replace(/'/g, '"');
    
    // Fix trailing commas
    text = text.replace(/,(\s*[}\]])/g, '$1');
    
    const obj = JSON.parse(text);
    return Facts.parse(obj);
  } catch (e) {
    // All strategies failed
  }

  throw new Error('Failed to parse JSON from model output. Output may not be valid JSON format.');
}

/**
 * Validate and sanitize facts before saving to database
 */
export function sanitizeFacts(facts: FactsType): FactsType {
  return {
    actions: facts.actions.map(a => ({
      ...a,
      owner: a.owner.trim(),
      description: a.description.trim(),
      due_date: a.due_date || null,
      confidence: a.confidence ?? 0.8,
    })),
    decisions: facts.decisions.map(d => ({
      ...d,
      summary: d.summary.trim(),
      rationale: d.rationale?.trim() || null,
      date: d.date || null,
    })),
    risks: facts.risks.map(r => ({
      ...r,
      summary: r.summary.trim(),
      owner_if_any: r.owner_if_any?.trim() || null,
    })),
  };
}

/**
 * Validate extraction quality and return confidence score
 */
export function assessExtractionQuality(facts: FactsType): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 1.0;

  // Check if we have any data
  const totalItems = facts.actions.length + facts.decisions.length + facts.risks.length;
  if (totalItems === 0) {
    issues.push('No items extracted from transcript');
    score = 0;
    return { score, issues };
  }

  // Check action quality
  facts.actions.forEach((action, idx) => {
    if (action.owner.length < 2) {
      issues.push(`Action ${idx + 1}: Owner name too short`);
      score -= 0.1;
    }
    if (action.description.length < 5) {
      issues.push(`Action ${idx + 1}: Description too vague`);
      score -= 0.1;
    }
    if (action.confidence && action.confidence < 0.5) {
      issues.push(`Action ${idx + 1}: Low confidence (${action.confidence})`);
      score -= 0.05;
    }
  });

  // Check decision quality
  facts.decisions.forEach((decision, idx) => {
    if (decision.summary.length < 5) {
      issues.push(`Decision ${idx + 1}: Summary too brief`);
      score -= 0.1;
    }
  });

  // Check risk quality
  facts.risks.forEach((risk, idx) => {
    if (risk.summary.length < 5) {
      issues.push(`Risk ${idx + 1}: Summary too brief`);
      score -= 0.1;
    }
  });

  return { score: Math.max(0, score), issues };
}
