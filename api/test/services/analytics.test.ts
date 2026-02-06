/**
 * Tests for Analytics Service
 */

import * as analytics from '../../src/services/analytics';
import * as repo from '../../src/db/repo';

// Mock the database repository
jest.mock('../../src/db/repo');

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOwnerWorkload', () => {
    it('should calculate workload for each owner', () => {
      const mockActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Task 1',
          status: 'pending',
          priority: 'high',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Task 2',
          status: 'in_progress',
          priority: 'medium',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 3,
          meeting_id: 1,
          owner: 'Bob',
          description: 'Task 3',
          status: 'completed',
          priority: 'low',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockActions)
      });

      const result = analytics.getOwnerWorkload();

      expect(result).toHaveLength(2);
      expect(result[0].owner).toBe('Alice');
      expect(result[0].totalActions).toBe(2);
      expect(result[0].pendingActions).toBe(1);
      expect(result[0].inProgressActions).toBe(1);
      expect(result[1].owner).toBe('Bob');
      expect(result[1].completedActions).toBe(1);
    });

    it('should calculate completion rates correctly', () => {
      const mockActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Task 1',
          status: 'completed',
          priority: 'high',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Task 2',
          status: 'completed',
          priority: 'medium',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 3,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Task 3',
          status: 'pending',
          priority: 'low',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockActions)
      });

      const result = analytics.getOwnerWorkload();

      expect(result[0].completionRate).toBeCloseTo(66.67, 1);
    });

    it('should identify overdue actions', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const mockActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Overdue task',
          status: 'pending',
          due_date: pastDate.toISOString(),
          priority: 'high',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockActions)
      });

      const result = analytics.getOwnerWorkload();

      expect(result[0].overdueActions).toBe(1);
    });

    it('should handle empty actions list', () => {
      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue([])
      });

      const result = analytics.getOwnerWorkload();

      expect(result).toEqual([]);
    });
  });

  describe('getRiskTrends', () => {
    it('should analyze risk trends over time', () => {
      const mockRisks: repo.Risk[] = [
        {
          id: 1,
          meeting_id: 1,
          summary: 'Security risk',
          severity: 'high',
          status: 'identified',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          meeting_id: 2,
          summary: 'Performance risk',
          severity: 'med',
          status: 'mitigating',
          created_at: '2024-01-16T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockRisks)
      });

      const result = analytics.getRiskTrends();

      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('recurringRisks');
      expect(result).toHaveProperty('resolutionRates');
      expect(result).toHaveProperty('statusChanges');
    });

    it('should detect recurring risks', () => {
      const mockRisks: repo.Risk[] = [
        {
          id: 1,
          meeting_id: 1,
          summary: 'Database performance issues',
          severity: 'high',
          status: 'identified',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          meeting_id: 2,
          summary: 'Database performance problems',
          severity: 'high',
          status: 'identified',
          created_at: '2024-01-20T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockRisks)
      });

      const result = analytics.getRiskTrends();

      expect(result.recurringRisks.length).toBeGreaterThan(0);
    });

    it('should calculate resolution rates by severity', () => {
      const mockRisks: repo.Risk[] = [
        {
          id: 1,
          meeting_id: 1,
          summary: 'Risk 1',
          severity: 'high',
          status: 'resolved',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          meeting_id: 1,
          summary: 'Risk 2',
          severity: 'high',
          status: 'identified',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockRisks)
      });

      const result = analytics.getRiskTrends();

      expect(result.resolutionRates).toHaveProperty('overall');
      expect(result.resolutionRates).toHaveProperty('bySeverity');
    });
  });

  describe('getDecisionTimeline', () => {
    it('should create timeline of decisions with context', () => {
      const mockDecisions: repo.Decision[] = [
        {
          id: 1,
          meeting_id: 1,
          summary: 'Adopt new framework',
          rationale: 'Better performance',
          impact: 'high',
          date: '2024-01-15T10:00:00Z',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      const mockMeeting: repo.Meeting = {
        id: 1,
        title: 'Architecture Review',
        meeting_date: '2024-01-15T10:00:00Z',
        meeting_type: 'planning',
        status: 'completed',
        created_at: '2024-01-15T10:00:00Z'
      };

      const mockActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Implement framework',
          status: 'pending',
          priority: 'high',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn()
          .mockReturnValueOnce(mockDecisions)
          .mockReturnValueOnce(mockActions)
      });
      (repo.getMeeting as jest.Mock).mockReturnValue(mockMeeting);

      const result = analytics.getDecisionTimeline();

      expect(result).toHaveLength(1);
      expect(result[0].decision).toEqual(mockDecisions[0]);
      expect(result[0].meeting).toEqual(mockMeeting);
      expect(result[0].relatedActions).toHaveLength(1);
    });

    it('should calculate days since decision', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const mockDecisions: repo.Decision[] = [
        {
          id: 1,
          meeting_id: 1,
          summary: 'Old decision',
          date: pastDate.toISOString(),
          created_at: pastDate.toISOString()
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn()
          .mockReturnValueOnce(mockDecisions)
          .mockReturnValueOnce([])
      });
      (repo.getMeeting as jest.Mock).mockReturnValue({
        id: 1,
        title: 'Meeting',
        meeting_date: pastDate.toISOString(),
        meeting_type: 'planning',
        status: 'completed',
        created_at: pastDate.toISOString()
      });

      const result = analytics.getDecisionTimeline();

      expect(result[0].daysOld).toBeGreaterThanOrEqual(10);
    });
  });

  describe('getActionCompletionRates', () => {
    it('should calculate overall completion rates', () => {
      const mockStats = [
        { status: 'completed', count: 50, avg_completion_days: 5 },
        { status: 'pending', count: 30, avg_completion_days: null },
        { status: 'in_progress', count: 20, avg_completion_days: null }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockStats)
      });

      const result = analytics.getActionCompletionRates();

      expect(result.overall.total).toBe(100);
      expect(result.overall.completed).toBe(50);
      expect(result.overall.completionRate).toBe(50);
    });

    it('should calculate completion rates by owner', () => {
      const mockActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Task 1',
          status: 'completed',
          priority: 'high',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Task 2',
          status: 'pending',
          priority: 'medium',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn()
          .mockReturnValueOnce([{ status: 'completed', count: 1, avg_completion_days: 5 }])
          .mockReturnValueOnce(mockActions)
      });

      const result = analytics.getActionCompletionRates();

      expect(result.byOwner).toBeInstanceOf(Array);
      expect(result.byOwner.length).toBeGreaterThan(0);
      const aliceStats = result.byOwner.find(o => o.owner === 'Alice');
      expect(aliceStats).toBeDefined();
      expect(aliceStats?.total).toBe(2);
      expect(aliceStats?.completed).toBe(1);
    });

    it('should identify bottlenecks in completion rates', () => {
      const mockStats = [
        { status: 'completed', count: 10, avg_completion_days: 5 },
        { status: 'pending', count: 90, avg_completion_days: null }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn()
          .mockReturnValueOnce(mockStats)
          .mockReturnValueOnce([])
      });

      const result = analytics.getActionCompletionRates();

      expect(result.bottlenecks).toBeDefined();
      expect(result.bottlenecks.length).toBeGreaterThan(0);
    });
  });

  describe('detectBottlenecks', () => {
    it('should detect overloaded owners', () => {
      const mockActions: repo.Action[] = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        meeting_id: 1,
        owner: 'Alice',
        description: `Task ${i + 1}`,
        status: 'pending',
        priority: 'high',
        created_at: '2024-01-15T10:00:00Z'
      }));

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockActions)
      });

      const result = analytics.detectBottlenecks();

      expect(result.overloadedOwners).toBeDefined();
      expect(result.overloadedOwners.length).toBeGreaterThan(0);
      expect(result.overloadedOwners[0].owner).toBe('Alice');
    });

    it('should detect stale actions', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);

      const mockActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Old task',
          status: 'pending',
          priority: 'high',
          created_at: oldDate.toISOString()
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockActions)
      });

      const result = analytics.detectBottlenecks();

      expect(result.staleActions).toBeDefined();
      expect(result.staleActions.length).toBeGreaterThan(0);
    });

    it('should detect overdue critical actions', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const mockActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Critical overdue task',
          status: 'pending',
          priority: 'critical',
          due_date: pastDate.toISOString(),
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockActions)
      });

      const result = analytics.detectBottlenecks();

      expect(result.overdueCriticalActions).toBeDefined();
      expect(result.overdueCriticalActions.length).toBeGreaterThan(0);
    });

    it('should detect high-risk items without owners', () => {
      const mockRisks: repo.Risk[] = [
        {
          id: 1,
          meeting_id: 1,
          summary: 'Unassigned critical risk',
          severity: 'critical',
          status: 'identified',
          owner_if_any: undefined,
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn()
          .mockReturnValueOnce([])
          .mockReturnValueOnce(mockRisks)
      });

      const result = analytics.detectBottlenecks();

      expect(result.highRiskWithoutOwners).toBeDefined();
      expect(result.highRiskWithoutOwners.length).toBeGreaterThan(0);
    });

    it('should provide summary of bottlenecks', () => {
      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue([])
      });

      const result = analytics.detectBottlenecks();

      expect(result.summary).toBeDefined();
      expect(result.summary).toHaveProperty('totalBottlenecks');
      expect(result.summary).toHaveProperty('criticalIssues');
      expect(result.summary).toHaveProperty('recommendations');
    });
  });

  describe('getAnalyticsSummary', () => {
    beforeEach(() => {
      // Mock all the analytics functions
      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue([])
      });
      (repo.getMeeting as jest.Mock).mockReturnValue(null);
    });

    it('should generate comprehensive analytics summary', () => {
      const result = analytics.getAnalyticsSummary();

      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('actionTrends');
      expect(result).toHaveProperty('decisionTrends');
      expect(result).toHaveProperty('riskTrends');
      expect(result).toHaveProperty('teamMetrics');
      expect(result).toHaveProperty('ownerWorkload');
      expect(result).toHaveProperty('actionCompletionRates');
      expect(result).toHaveProperty('decisionTimeline');
      expect(result).toHaveProperty('bottlenecks');
    });

    it('should include timestamp in ISO format', () => {
      const result = analytics.getAnalyticsSummary();

      expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', () => {
      (repo.db.prepare as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      expect(() => analytics.getOwnerWorkload()).toThrow('Database error');
    });

    it('should handle null/undefined values in data', () => {
      const mockActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Task',
          status: 'pending',
          priority: null as any,
          due_date: undefined,
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockActions)
      });

      expect(() => analytics.getOwnerWorkload()).not.toThrow();
    });

    it('should handle empty date strings', () => {
      const mockActions: repo.Action[] = [
        {
          id: 1,
          meeting_id: 1,
          owner: 'Alice',
          description: 'Task',
          status: 'pending',
          priority: 'high',
          due_date: '',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      (repo.db.prepare as jest.Mock).mockReturnValue({
        all: jest.fn().mockReturnValue(mockActions)
      });

      expect(() => analytics.getOwnerWorkload()).not.toThrow();
    });
  });
});

// Made with Bob
