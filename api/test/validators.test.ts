
import { parseFactsJson } from '../src/utils/validators';

describe('parseFactsJson', () => {
  it('extracts and validates JSON block', () => {
    const text = `blah {"actions":[{"owner":"Ana","description":"Ship plan","confidence":0.9}],
      "decisions":[{"summary":"Move to weekly sync"}],
      "risks":[{"summary":"Bandwidth","severity":"med"}]} tail`;
    const out = parseFactsJson(text);
    expect(out.actions[0].owner).toBe('Ana');
    expect(out.risks[0].severity).toBe('med');
  });
});
