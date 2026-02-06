/**
 * Tests for Document Generation Service
 */

import * as docgen from '../../src/services/docgen';
import * as repo from '../../src/db/repo';

// Mock the database repository
jest.mock('../../src/db/repo');

describe('Document Generation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMeetingMinutes', () => {
    const mockMeeting: repo.Meeting = {
      id: 1,
      title: 'Sprint Planning',
      meeting_date: '2024-01-15T10:00:00Z',
      meeting_type: 'planning',
      duration_minutes: 60,
      location: 'Conference Room A',
      status: 'completed',
      created_at: '2024-01-15T10:00:00Z'
    };

    const mockSpeakers: repo.Speaker[] = [
      {
        id: 1,
        meeting_id: 1,
        speaker_label: 'Speaker 1',
        speaker_name: 'Alice Johnson',
        role: 'Product Manager',
        total_speaking_time_seconds: 300
      },
      {
        id: 2,
        meeting_id: 1,
        speaker_label: 'Speaker 2',
        speaker_name: 'Bob Smith',
        role: 'Developer',
        total_speaking_time_seconds: 250
      }
    ];

    const mockActions: repo.Action[] = [
      {
        id: 1,
        meeting_id: 1,
        owner: 'Alice Johnson',
        description: 'Review API documentation',
        due_date: '2024-01-20T00:00:00Z',
        priority: 'high',
        status: 'pending',
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    const mockDecisions: repo.Decision[] = [
      {
        id: 1,
        meeting_id: 1,
        summary: 'Adopt microservices architecture',
        rationale: 'Better scalability and maintainability',
        impact: 'high',
        stakeholders: JSON.stringify(['Engineering', 'Product']),
        date: '2024-01-15T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    const mockRisks: repo.Risk[] = [
      {
        id: 1,
        meeting_id: 1,
        summary: 'Database migration complexity',
        severity: 'high',
        status: 'identified',
        owner_if_any: 'Bob Smith',
        mitigation_plan: 'Create detailed migration plan with rollback strategy',
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    const mockStats = {
      actions: 1,
      decisions: 1,
      risks: 1,
      speakers: 2
    };

    beforeEach(() => {
      (repo.getMeeting as jest.Mock).mockReturnValue(mockMeeting);
      (repo.getSpeakersByMeeting as jest.Mock).mockReturnValue(mockSpeakers);
      (repo.getTranscriptByMeeting as jest.Mock).mockReturnValue([]);
      (repo.getMeetingStats as jest.Mock).mockReturnValue(mockStats);
      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn()
          .mockReturnValueOnce(mockActions)
          .mockReturnValueOnce(mockDecisions)
          .mockReturnValueOnce(mockRisks)
      });
    });

    it('should generate markdown minutes with default options', async () => {
      const result = await docgen.generateMeetingMinutes(1);

      expect(result).toContain('# Meeting Minutes: Sprint Planning');
      expect(result).toContain('## Meeting Information');
      expect(result).toContain('## Attendees');
      expect(result).toContain('Alice Johnson');
      expect(result).toContain('Bob Smith');
      expect(result).toContain('## Decisions Made');
      expect(result).toContain('## Action Items');
      expect(result).toContain('## Risks & Issues');
      expect(repo.getMeeting).toHaveBeenCalledWith(1);
    });

    it('should generate HTML minutes when format is html', async () => {
      const result = await docgen.generateMeetingMinutes(1, { format: 'html' });

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<h1>Meeting Minutes: Sprint Planning</h1>');
      expect(result).toContain('<style>');
      expect(result).toContain('</html>');
    });

    it('should generate text minutes when format is text', async () => {
      const result = await docgen.generateMeetingMinutes(1, { format: 'text' });

      expect(result).toContain('Meeting Minutes: Sprint Planning');
      expect(result).not.toContain('#');
      expect(result).not.toContain('**');
      expect(result).not.toContain('<');
    });

    it('should include transcript when includeTranscript is true', async () => {
      const mockTranscript: repo.TranscriptSegment[] = [
        {
          id: 1,
          meeting_id: 1,
          speaker_id: 1,
          text: 'Let\'s discuss the sprint goals',
          start_time: 0,
          end_time: 5,
        }
      ];
      (repo.getTranscriptByMeeting as jest.Mock).mockReturnValue(mockTranscript);

      const result = await docgen.generateMeetingMinutes(1, { includeTranscript: true });

      expect(result).toContain('## Transcript');
      expect(result).toContain('Let\'s discuss the sprint goals');
    });

    it('should exclude timestamps when includeTimestamps is false', async () => {
      const result = await docgen.generateMeetingMinutes(1, { includeTimestamps: false });

      expect(result).not.toContain('*Generated on');
    });

    it('should throw error for invalid meeting ID', async () => {
      await expect(docgen.generateMeetingMinutes(0)).rejects.toThrow('Invalid meeting ID');
      await expect(docgen.generateMeetingMinutes(-1)).rejects.toThrow('Invalid meeting ID');
      await expect(docgen.generateMeetingMinutes(NaN)).rejects.toThrow('Invalid meeting ID');
    });

    it('should throw error when meeting not found', async () => {
      (repo.getMeeting as jest.Mock).mockReturnValue(null);

      await expect(docgen.generateMeetingMinutes(999)).rejects.toThrow('Meeting with ID 999 not found');
    });

    it('should handle database errors gracefully', async () => {
      (repo.db.prepare as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(docgen.generateMeetingMinutes(1)).rejects.toThrow('Failed to generate meeting minutes');
    });
  });

  describe('generateActionItemReport', () => {
    const mockActions: repo.Action[] = [
      {
        id: 1,
        meeting_id: 1,
        owner: 'Alice',
        description: 'Complete feature X',
        due_date: '2024-01-20T00:00:00Z',
        priority: 'high',
        status: 'pending',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        meeting_id: 1,
        owner: 'Alice',
        description: 'Review PR',
        due_date: '2024-01-18T00:00:00Z',
        priority: 'medium',
        status: 'in_progress',
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    it('should generate report for specific owner', () => {
      (repo.getActionsByOwner as jest.Mock).mockReturnValue(mockActions);

      const result = docgen.generateActionItemReport('Alice');

      expect(result).toContain('# Action Item Report');
      expect(result).toContain('## Actions for Alice');
      expect(result).toContain('Total: 2');
      expect(result).toContain('Complete feature X');
      expect(result).toContain('Review PR');
      expect(repo.getActionsByOwner).toHaveBeenCalledWith('Alice');
    });

    it('should generate report for all owners', () => {
      const mockWorkload = [
        { owner: 'Alice', pending: 2, in_progress: 1, total: 3 },
        { owner: 'Bob', pending: 1, in_progress: 0, total: 1 }
      ];
      (repo.getOwnerWorkload as jest.Mock).mockReturnValue(mockWorkload);
      (repo.getOverdueActions as jest.Mock).mockReturnValue([]);

      const result = docgen.generateActionItemReport();

      expect(result).toContain('# Action Item Report');
      expect(result).toContain('## Workload by Owner');
      expect(result).toContain('### Alice');
      expect(result).toContain('### Bob');
    });

    it('should highlight overdue actions', () => {
      const overdueActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Overdue task',
          due_date: '2024-01-10T00:00:00Z',
          priority: 'critical',
          status: 'pending',
          created_at: '2024-01-05T10:00:00Z'
        }
      ];
      (repo.getOwnerWorkload as jest.Mock).mockReturnValue([]);
      (repo.getOverdueActions as jest.Mock).mockReturnValue(overdueActions);

      const result = docgen.generateActionItemReport();

      expect(result).toContain('## ⚠️ Overdue Actions');
      expect(result).toContain('Overdue task');
    });

    it('should throw error for empty owner name', () => {
      expect(() => docgen.generateActionItemReport('')).toThrow('Owner name cannot be empty');
      expect(() => docgen.generateActionItemReport('   ')).toThrow('Owner name cannot be empty');
    });

    it('should handle no actions found', () => {
      (repo.getActionsByOwner as jest.Mock).mockReturnValue([]);

      const result = docgen.generateActionItemReport('NonExistent');

      expect(result).toContain('No actions found for this owner');
    });
  });

  describe('generateRiskAssessmentReport', () => {
    const mockHighRisks: repo.Risk[] = [
      {
        id: 1,
        meeting_id: 1,
        summary: 'Critical security vulnerability',
        severity: 'critical',
        status: 'identified',
        owner_if_any: 'Security Team',
        mitigation_plan: 'Patch immediately',
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    const mockAllRisks: repo.Risk[] = [
      ...mockHighRisks,
      {
        id: 2,
        meeting_id: 1,
        summary: 'Minor UI issue',
        severity: 'low',
        status: 'resolved',
        owner_if_any: 'Frontend Team',
        mitigation_plan: undefined,
        created_at: '2024-01-14T10:00:00Z'
      }
    ];

    beforeEach(() => {
      (repo.getHighSeverityRisks as jest.Mock).mockReturnValue(mockHighRisks);
      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockAllRisks)
      });
    });

    it('should generate risk assessment report', () => {
      const result = docgen.generateRiskAssessmentReport();

      expect(result).toContain('# Risk Assessment Report');
      expect(result).toContain('## High Severity Risks');
      expect(result).toContain('Critical security vulnerability');
      expect(result).toContain('## Overall Risk Statistics');
    });

    it('should show statistics by severity and status', () => {
      const result = docgen.generateRiskAssessmentReport();

      expect(result).toContain('**Total Risks:** 2');
      expect(result).toContain('Critical: 1');
      expect(result).toContain('Low: 1');
      expect(result).toContain('Identified: 1');
      expect(result).toContain('Resolved: 1');
    });

    it('should handle no high severity risks', () => {
      (repo.getHighSeverityRisks as jest.Mock).mockReturnValue([]);

      const result = docgen.generateRiskAssessmentReport();

      expect(result).toContain('✅ No high severity risks identified');
    });
  });

  describe('generateExecutiveSummary', () => {
    beforeEach(() => {
      (repo.getMeeting as jest.Mock).mockImplementation((id: number) => ({
        id,
        title: `Meeting ${id}`,
        meeting_date: '2024-01-15T10:00:00Z',
        meeting_type: 'planning',
        status: 'completed',
        created_at: '2024-01-15T10:00:00Z'
      }));
      (repo.getMeetingStats as jest.Mock).mockReturnValue({
        actions: 5,
        decisions: 3,
        risks: 2,
        speakers: 4
      });
      (repo.getPendingActions as jest.Mock).mockReturnValue([]);
      (repo.getOverdueActions as jest.Mock).mockReturnValue([]);
      (repo.getHighSeverityRisks as jest.Mock).mockReturnValue([]);
      (repo.getOwnerWorkload as jest.Mock).mockReturnValue([]);
    });

    it('should generate executive summary for multiple meetings', () => {
      const result = docgen.generateExecutiveSummary([1, 2, 3]);

      expect(result).toContain('# Executive Summary');
      expect(result).toContain('Meetings Analyzed: 3');
      expect(result).toContain('## Key Metrics');
      expect(result).toContain('**Total Actions:** 15');
      expect(result).toContain('**Total Decisions:** 9');
      expect(result).toContain('**Total Risks:** 6');
    });

    it('should throw error for invalid input', () => {
      expect(() => docgen.generateExecutiveSummary(null as any)).toThrow('Meeting IDs must be provided as an array');
      expect(() => docgen.generateExecutiveSummary([] as any)).toThrow('At least one meeting ID must be provided');
    });

    it('should handle invalid meeting IDs gracefully', () => {
      (repo.getMeeting as jest.Mock).mockImplementation((id: number) => {
        if (id === 999) return null;
        return { id, title: `Meeting ${id}`, meeting_date: '2024-01-15T10:00:00Z', meeting_type: 'planning', status: 'completed', created_at: '2024-01-15T10:00:00Z' };
      });

      const result = docgen.generateExecutiveSummary([1, 999, 2]);

      expect(result).toContain('Meetings Analyzed: 2');
      expect(result).toContain('⚠️ Invalid/Not Found: 1');
    });

    it('should highlight overdue actions', () => {
      const overdueActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Critical task',
          due_date: '2024-01-10T00:00:00Z',
          priority: 'critical',
          status: 'pending',
          created_at: '2024-01-05T10:00:00Z'
        }
      ];
      (repo.getOverdueActions as jest.Mock).mockReturnValue(overdueActions);

      const result = docgen.generateExecutiveSummary([1]);

      expect(result).toContain('## ⚠️ Attention Required');
      expect(result).toContain('Critical task');
    });

    it('should show team workload distribution', () => {
      const mockWorkload = [
        { owner: 'Alice', pending: 5, in_progress: 2, total: 7 },
        { owner: 'Bob', pending: 3, in_progress: 1, total: 4 }
      ];
      (repo.getOwnerWorkload as jest.Mock).mockReturnValue(mockWorkload);

      const result = docgen.generateExecutiveSummary([1]);

      expect(result).toContain('## Team Workload');
      expect(result).toContain('**Alice**: 7 items');
      expect(result).toContain('**Bob**: 4 items');
    });
  });

  describe('Helper Functions', () => {
    describe('formatConfidenceScore', () => {
      it('should format high confidence with checkmark', () => {
        expect(docgen.formatConfidenceScore(0.95)).toBe('✅ 95%');
        expect(docgen.formatConfidenceScore(0.90)).toBe('✅ 90%');
      });

      it('should format medium-high confidence with check', () => {
        expect(docgen.formatConfidenceScore(0.85)).toBe('✓ 85%');
        expect(docgen.formatConfidenceScore(0.75)).toBe('✓ 75%');
      });

      it('should format medium confidence with warning', () => {
        expect(docgen.formatConfidenceScore(0.65)).toBe('⚠️ 65%');
        expect(docgen.formatConfidenceScore(0.60)).toBe('⚠️ 60%');
      });

      it('should format low confidence with X', () => {
        expect(docgen.formatConfidenceScore(0.55)).toBe('❌ 55%');
        expect(docgen.formatConfidenceScore(0.30)).toBe('❌ 30%');
      });
    });

    describe('calculateStatistics', () => {
      it('should calculate statistics for numeric field', () => {
        const items = [
          { value: 10 },
          { value: 20 },
          { value: 30 }
        ];

        const stats = docgen.calculateStatistics(items, 'value');

        expect(stats.total).toBe(3);
        expect(stats.average).toBe(20);
        expect(stats.min).toBe(10);
        expect(stats.max).toBe(30);
      });

      it('should handle empty array', () => {
        const stats = docgen.calculateStatistics([], 'value');

        expect(stats.total).toBe(0);
        expect(stats.average).toBe(0);
        expect(stats.min).toBe(0);
        expect(stats.max).toBe(0);
      });

      it('should filter out non-numeric values', () => {
        const items = [
          { value: 10 },
          { value: 'invalid' },
          { value: 20 },
          { value: null }
        ];

        const stats = docgen.calculateStatistics(items, 'value');

        expect(stats.total).toBe(4);
        expect(stats.average).toBe(15);
        expect(stats.min).toBe(10);
        expect(stats.max).toBe(20);
      });
    });

    describe('formatStatistics', () => {
      it('should format statistics as readable string', () => {
        const stats = {
          total: 10,
          average: 25.5,
          min: 10,
          max: 50
        };

        const result = docgen.formatStatistics(stats);

        expect(result).toBe('Total: 10, Avg: 25.50, Min: 10, Max: 50');
      });
    });
  });
});

// Made with Bob
