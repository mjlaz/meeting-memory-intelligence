import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as analytics from '../services/analytics.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const daysSchema = z.object({
  days: z.number().int().positive().max(365).default(30)
});

const meetingIdsSchema = z.object({
  meeting_ids: z.array(z.number().int().positive()).optional()
});

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * GET /analytics/summary
 * Get comprehensive analytics summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days must be between 1 and 365'
      });
    }
    
    const summary = analytics.getAnalyticsSummary(days);
    
    res.json({
      success: true,
      summary,
      period_days: days
    });
  } catch (error: any) {
    console.error('Error generating analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics summary'
    });
  }
});

/**
 * GET /analytics/actions/trends
 * Get action item trends
 */
router.get('/actions/trends', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const trends = analytics.analyzeActionTrends(days);
    
    res.json({
      success: true,
      trends,
      period_days: days
    });
  } catch (error: any) {
    console.error('Error analyzing action trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze action trends'
    });
  }
});

/**
 * GET /analytics/actions/stats
 * Get action completion statistics
 */
router.get('/actions/stats', async (req: Request, res: Response) => {
  try {
    const stats = analytics.getActionCompletionStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('Error getting action stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get action statistics'
    });
  }
});

/**
 * GET /analytics/decisions/trends
 * Get decision trends
 */
router.get('/decisions/trends', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const trends = analytics.analyzeDecisionTrends(days);
    
    res.json({
      success: true,
      trends,
      period_days: days
    });
  } catch (error: any) {
    console.error('Error analyzing decision trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze decision trends'
    });
  }
});

/**
 * GET /analytics/decisions/impact
 * Get decision impact distribution
 */
router.get('/decisions/impact', async (req: Request, res: Response) => {
  try {
    const distribution = analytics.getDecisionImpactDistribution();
    
    res.json({
      success: true,
      distribution
    });
  } catch (error: any) {
    console.error('Error getting decision impact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get decision impact distribution'
    });
  }
});

/**
 * GET /analytics/risks/trends
 * Get risk trends
 */
router.get('/risks/trends', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const trends = analytics.analyzeRiskTrends(days);
    
    res.json({
      success: true,
      trends,
      period_days: days
    });
  } catch (error: any) {
    console.error('Error analyzing risk trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze risk trends'
    });
  }
});

/**
 * GET /analytics/risks/distribution
 * Get risk severity distribution
 */
router.get('/risks/distribution', async (req: Request, res: Response) => {
  try {
    const distribution = analytics.getRiskSeverityDistribution();
    
    res.json({
      success: true,
      distribution
    });
  } catch (error: any) {
    console.error('Error getting risk distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get risk distribution'
    });
  }
});

/**
 * GET /analytics/team/metrics
 * Get team performance metrics
 */
router.get('/team/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = analytics.analyzeTeamMetrics();
    
    res.json({
      success: true,
      metrics
    });
  } catch (error: any) {
    console.error('Error analyzing team metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze team metrics'
    });
  }
});

/**
 * GET /analytics/team/balance
 * Get team workload balance
 */
router.get('/team/balance', async (req: Request, res: Response) => {
  try {
    const balance = analytics.getTeamWorkloadBalance();
    
    res.json({
      success: true,
      balance
    });
  } catch (error: any) {
    console.error('Error getting team balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team workload balance'
    });
  }
});

/**
 * POST /analytics/meetings/effectiveness
 * Analyze meeting effectiveness
 */
router.post('/meetings/effectiveness', async (req: Request, res: Response) => {
  try {
    const validated = meetingIdsSchema.parse(req.body);
    
    const effectiveness = analytics.analyzeMeetingEffectiveness(validated.meeting_ids);
    
    res.json({
      success: true,
      effectiveness,
      count: effectiveness.length
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error analyzing meeting effectiveness:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze meeting effectiveness'
    });
  }
});

/**
 * GET /analytics/meetings/effectiveness
 * Analyze meeting effectiveness (all recent meetings)
 */
router.get('/meetings/effectiveness', async (req: Request, res: Response) => {
  try {
    const effectiveness = analytics.analyzeMeetingEffectiveness();
    
    res.json({
      success: true,
      effectiveness,
      count: effectiveness.length
    });
  } catch (error: any) {
    console.error('Error analyzing meeting effectiveness:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze meeting effectiveness'
    });
  }
});

/**
 * GET /analytics/insights/predictive
 * Get predictive insights and recommendations
 */
router.get('/insights/predictive', async (req: Request, res: Response) => {
  try {
    const insights = analytics.generatePredictiveInsights();
    
    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    console.error('Error generating predictive insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate predictive insights'
    });
  }
});

/**
 * GET /analytics/dashboard
 * Get dashboard data (key metrics for visualization)
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const actionStats = analytics.getActionCompletionStats();
    const teamMetrics = analytics.analyzeTeamMetrics();
    const teamBalance = analytics.getTeamWorkloadBalance();
    const predictiveInsights = analytics.generatePredictiveInsights();
    const meetingEffectiveness = analytics.analyzeMeetingEffectiveness().slice(0, 10);
    
    res.json({
      success: true,
      dashboard: {
        overview: {
          totalActions: actionStats.total,
          completedActions: actionStats.completed,
          pendingActions: actionStats.pending,
          completionRate: actionStats.completionRate,
          averageCompletionDays: actionStats.averageCompletionDays
        },
        team: {
          totalMembers: teamMetrics.length,
          balanced: teamBalance.balanced,
          imbalanceScore: teamBalance.imbalanceScore,
          topPerformers: teamMetrics.slice(0, 5)
        },
        alerts: {
          atRiskActions: predictiveInsights.atRiskActions.length,
          overloadedOwners: predictiveInsights.overloadedOwners.length,
          recommendations: predictiveInsights.recommendations
        },
        recentMeetings: meetingEffectiveness
      },
      period_days: days
    });
  } catch (error: any) {
    console.error('Error generating dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate dashboard data'
    });
  }
});

/**
 * GET /analytics/charts/action-trends
 * Get action trends data formatted for charts
 */
router.get('/charts/action-trends', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const trends = analytics.analyzeActionTrends(days);
    
    // Format for chart libraries (e.g., Chart.js, Recharts)
    const chartData = {
      labels: trends.total.map(t => t.period),
      datasets: [
        {
          label: 'Total Actions',
          data: trends.total.map(t => t.value),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)'
        },
        {
          label: 'Completed',
          data: trends.completed.map(t => t.value),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)'
        },
        {
          label: 'Overdue',
          data: trends.overdue.map(t => t.value),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)'
        }
      ]
    };
    
    res.json({
      success: true,
      chartData,
      period_days: days
    });
  } catch (error: any) {
    console.error('Error generating chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate chart data'
    });
  }
});

/**
 * GET /analytics/charts/team-workload
 * Get team workload data formatted for charts
 */
router.get('/charts/team-workload', async (req: Request, res: Response) => {
  try {
    const metrics = analytics.analyzeTeamMetrics();
    
    const chartData = {
      labels: metrics.map(m => m.owner),
      datasets: [
        {
          label: 'Pending',
          data: metrics.map(m => m.pendingActions),
          backgroundColor: 'rgba(255, 206, 86, 0.6)'
        },
        {
          label: 'Completed',
          data: metrics.map(m => m.completedActions),
          backgroundColor: 'rgba(75, 192, 192, 0.6)'
        },
        {
          label: 'Overdue',
          data: metrics.map(m => m.overdueActions),
          backgroundColor: 'rgba(255, 99, 132, 0.6)'
        }
      ]
    };
    
    res.json({
      success: true,
      chartData
    });
  } catch (error: any) {
    console.error('Error generating team workload chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate team workload chart'
    });
  }
});

export default router;

// Made with Bob
