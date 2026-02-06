/**
 * Analytics Service
 * 
 * Provides trend detection, pattern analysis, and insights across meetings:
 * - Action item trends and completion rates
 * - Decision velocity and impact analysis
 * - Risk patterns and escalation tracking
 * - Team participation and workload trends
 * - Meeting effectiveness metrics
 * - Predictive insights and recommendations
 */

import * as repo from '../db/repo.js';

// ============================================================================
// TYPES
// ============================================================================

export interface TrendData {
  period: string;
  value: number;
  change?: number;
  changePercent?: number;
}

export interface ActionTrends {
  total: TrendData[];
  completed: TrendData[];
  overdue: TrendData[];
  completionRate: TrendData[];
  averageAge: TrendData[];
}

export interface DecisionTrends {
  total: TrendData[];
  byImpact: {
    high: TrendData[];
    medium: TrendData[];
    low: TrendData[];
  };
  velocity: TrendData[]; // Decisions per meeting
}

export interface RiskTrends {
  total: TrendData[];
  bySeverity: {
    critical: TrendData[];
    high: TrendData[];
    med: TrendData[];
    low: TrendData[];
  };
  resolved: TrendData[];
  resolutionRate: TrendData[];
}

export interface TeamMetrics {
  owner: string;
  totalActions: number;
  completedActions: number;
  pendingActions: number;
  overdueActions: number;
  completionRate: number;
  averageCompletionTime?: number;
  workloadTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface MeetingEffectiveness {
  meetingId: number;
  title: string;
  date: string;
  type: string;
  duration?: number;
  attendees: number;
  actionsPerAttendee: number;
  decisionsPerHour: number;
  risksIdentified: number;
  effectivenessScore: number; // 0-100
  insights: string[];
}

export interface PredictiveInsights {
  atRiskActions: Array<{
    action: repo.Action;
    riskScore: number;
    reasons: string[];
  }>;
  overloadedOwners: Array<{
    owner: string;
    currentLoad: number;
    recommendedAction: string;
  }>;
  trendingRisks: Array<{
    category: string;
    occurrences: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
  recommendations: string[];
}

// ============================================================================
// ACTION ANALYTICS
// ============================================================================

/**
 * Analyze action item trends over time
 */
export function analyzeActionTrends(days: number = 30): ActionTrends {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const allActions = repo.db.prepare(`
    SELECT * FROM actions 
    WHERE created_at >= ? 
    ORDER BY created_at
  `).all(cutoffDate.toISOString()) as repo.Action[];
  
  // Group by week
  const weeklyData = groupByWeek(allActions, days);
  
  const trends: ActionTrends = {
    total: [],
    completed: [],
    overdue: [],
    completionRate: [],
    averageAge: []
  };
  
  weeklyData.forEach(week => {
    const total = week.actions.length;
    const completed = week.actions.filter(a => a.status === 'completed').length;
    const overdue = week.actions.filter(a => 
      a.due_date && new Date(a.due_date) < new Date() && a.status === 'pending'
    ).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    trends.total.push({ period: week.period, value: total });
    trends.completed.push({ period: week.period, value: completed });
    trends.overdue.push({ period: week.period, value: overdue });
    trends.completionRate.push({ period: week.period, value: completionRate });
  });
  
  // Calculate changes
  calculateChanges(trends.total);
  calculateChanges(trends.completed);
  calculateChanges(trends.overdue);
  calculateChanges(trends.completionRate);
  
  return trends;
}

/**
 * Get action completion statistics
 */
export function getActionCompletionStats() {
  const stats = repo.db.prepare(`
    SELECT 
      status,
      COUNT(*) as count,
      AVG(CASE 
        WHEN status = 'completed' AND created_at IS NOT NULL 
        THEN julianday('now') - julianday(created_at)
        ELSE NULL 
      END) as avg_completion_days
    FROM actions
    GROUP BY status
  `).all() as Array<{ status: string; count: number; avg_completion_days: number | null }>;
  
  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const completed = stats.find(s => s.status === 'completed')?.count || 0;
  const pending = stats.find(s => s.status === 'pending')?.count || 0;
  const inProgress = stats.find(s => s.status === 'in_progress')?.count || 0;
  
  return {
    total,
    completed,
    pending,
    inProgress,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    averageCompletionDays: stats.find(s => s.status === 'completed')?.avg_completion_days || 0
  };
}

// ============================================================================
// DECISION ANALYTICS
// ============================================================================

/**
 * Analyze decision trends over time
 */
export function analyzeDecisionTrends(days: number = 30): DecisionTrends {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const allDecisions = repo.db.prepare(`
    SELECT * FROM decisions 
    WHERE created_at >= ? 
    ORDER BY created_at
  `).all(cutoffDate.toISOString()) as repo.Decision[];
  
  const weeklyData = groupByWeek(allDecisions, days);
  
  const trends: DecisionTrends = {
    total: [],
    byImpact: {
      high: [],
      medium: [],
      low: []
    },
    velocity: []
  };
  
  weeklyData.forEach(week => {
    const total = week.actions.length;
    const high = week.actions.filter((d: any) => d.impact === 'high').length;
    const medium = week.actions.filter((d: any) => d.impact === 'medium').length;
    const low = week.actions.filter((d: any) => d.impact === 'low').length;
    
    trends.total.push({ period: week.period, value: total });
    trends.byImpact.high.push({ period: week.period, value: high });
    trends.byImpact.medium.push({ period: week.period, value: medium });
    trends.byImpact.low.push({ period: week.period, value: low });
    trends.velocity.push({ period: week.period, value: total });
  });
  
  calculateChanges(trends.total);
  calculateChanges(trends.velocity);
  
  return trends;
}

/**
 * Get decision impact distribution
 */
export function getDecisionImpactDistribution() {
  const distribution = repo.db.prepare(`
    SELECT 
      impact,
      COUNT(*) as count
    FROM decisions
    WHERE impact IS NOT NULL
    GROUP BY impact
  `).all() as Array<{ impact: string; count: number }>;
  
  const total = distribution.reduce((sum, d) => sum + d.count, 0);
  
  return distribution.map(d => ({
    impact: d.impact,
    count: d.count,
    percentage: total > 0 ? (d.count / total) * 100 : 0
  }));
}

// ============================================================================
// RISK ANALYTICS
// ============================================================================

/**
 * Analyze risk trends over time
 */
export function analyzeRiskTrends(days: number = 30): RiskTrends {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const allRisks = repo.db.prepare(`
    SELECT * FROM risks 
    WHERE created_at >= ? 
    ORDER BY created_at
  `).all(cutoffDate.toISOString()) as repo.Risk[];
  
  const weeklyData = groupByWeek(allRisks, days);
  
  const trends: RiskTrends = {
    total: [],
    bySeverity: {
      critical: [],
      high: [],
      med: [],
      low: []
    },
    resolved: [],
    resolutionRate: []
  };
  
  weeklyData.forEach(week => {
    const total = week.actions.length;
    const critical = week.actions.filter((r: any) => r.severity === 'critical').length;
    const high = week.actions.filter((r: any) => r.severity === 'high').length;
    const med = week.actions.filter((r: any) => r.severity === 'med').length;
    const low = week.actions.filter((r: any) => r.severity === 'low').length;
    const resolved = week.actions.filter((r: any) => r.status === 'resolved').length;
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;
    
    trends.total.push({ period: week.period, value: total });
    trends.bySeverity.critical.push({ period: week.period, value: critical });
    trends.bySeverity.high.push({ period: week.period, value: high });
    trends.bySeverity.med.push({ period: week.period, value: med });
    trends.bySeverity.low.push({ period: week.period, value: low });
    trends.resolved.push({ period: week.period, value: resolved });
    trends.resolutionRate.push({ period: week.period, value: resolutionRate });
  });
  
  calculateChanges(trends.total);
  calculateChanges(trends.resolved);
  calculateChanges(trends.resolutionRate);
  
  return trends;
}

/**
 * Get risk severity distribution
 */
export function getRiskSeverityDistribution() {
  const distribution = repo.db.prepare(`
    SELECT 
      severity,
      status,
      COUNT(*) as count
    FROM risks
    GROUP BY severity, status
  `).all() as Array<{ severity: string; status: string; count: number }>;
  
  return distribution;
}

// ============================================================================
// TEAM ANALYTICS
// ============================================================================

/**
 * Analyze team performance metrics
 */
export function analyzeTeamMetrics(): TeamMetrics[] {
  const owners = repo.db.prepare(`
    SELECT DISTINCT owner FROM actions WHERE owner IS NOT NULL
  `).all() as Array<{ owner: string }>;
  
  return owners.map(({ owner }) => {
    const actions = repo.getActionsByOwner(owner);
    const total = actions.length;
    const completed = actions.filter(a => a.status === 'completed').length;
    const pending = actions.filter(a => a.status === 'pending').length;
    const overdue = actions.filter(a => 
      a.due_date && new Date(a.due_date) < new Date() && a.status === 'pending'
    ).length;
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    // Calculate workload trend (last 2 weeks vs previous 2 weeks)
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    
    const recentActions = actions.filter(a => 
      new Date(a.created_at!) >= twoWeeksAgo
    ).length;
    
    const previousActions = actions.filter(a => 
      new Date(a.created_at!) >= fourWeeksAgo && new Date(a.created_at!) < twoWeeksAgo
    ).length;
    
    let workloadTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentActions > previousActions * 1.2) workloadTrend = 'increasing';
    else if (recentActions < previousActions * 0.8) workloadTrend = 'decreasing';
    
    return {
      owner,
      totalActions: total,
      completedActions: completed,
      pendingActions: pending,
      overdueActions: overdue,
      completionRate,
      workloadTrend
    };
  }).sort((a, b) => b.totalActions - a.totalActions);
}

/**
 * Get owner workload with detailed metrics
 */
export function getOwnerWorkload(): Array<{
  owner: string;
  totalActions: number;
  completedActions: number;
  pendingActions: number;
  inProgressActions: number;
  overdueActions: number;
  completionRate: number;
  averageConfidence: number;
}> {
  const owners = repo.db.prepare(`
    SELECT DISTINCT owner FROM actions WHERE owner IS NOT NULL
  `).all() as Array<{ owner: string }>;
  
  return owners.map(({ owner }) => {
    const actions = repo.getActionsByOwner(owner);
    const total = actions.length;
    const completed = actions.filter(a => a.status === 'completed').length;
    const pending = actions.filter(a => a.status === 'pending').length;
    const inProgress = actions.filter(a => a.status === 'in_progress').length;
    const overdue = actions.filter(a =>
      a.due_date && new Date(a.due_date) < new Date() && a.status === 'pending'
    ).length;
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    // Calculate average confidence score
    const confidenceScores = actions
      .filter(a => a.confidence !== null && a.confidence !== undefined)
      .map(a => a.confidence!);
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length
      : 0;
    
    return {
      owner,
      totalActions: total,
      completedActions: completed,
      pendingActions: pending,
      inProgressActions: inProgress,
      overdueActions: overdue,
      completionRate,
      averageConfidence
    };
  }).sort((a, b) => b.totalActions - a.totalActions);
}

/**
 * Get team workload balance
 */
export function getTeamWorkloadBalance() {
  const workload = repo.getOwnerWorkload();
  
  if (workload.length === 0) {
    return {
      balanced: true,
      maxLoad: 0,
      minLoad: 0,
      avgLoad: 0,
      imbalanceScore: 0
    };
  }
  
  const loads = workload.map(w => w.total);
  const maxLoad = Math.max(...loads);
  const minLoad = Math.min(...loads);
  const avgLoad = loads.reduce((sum, l) => sum + l, 0) / loads.length;
  const imbalanceScore = maxLoad > 0 ? ((maxLoad - minLoad) / maxLoad) * 100 : 0;
  
  return {
    balanced: imbalanceScore < 30, // Less than 30% difference
    maxLoad,
    minLoad,
    avgLoad,
    imbalanceScore,
    owners: workload
  };
}

// ============================================================================
// MEETING EFFECTIVENESS
// ============================================================================

/**
 * Calculate meeting effectiveness scores
 */
export function analyzeMeetingEffectiveness(meetingIds?: number[]): MeetingEffectiveness[] {
  const meetings = meetingIds 
    ? meetingIds.map(id => repo.getMeeting(id)).filter(m => m !== undefined) as repo.Meeting[]
    : repo.getAllMeetings(50, 0);
  
  return meetings.map(meeting => {
    const stats = repo.getMeetingStats(meeting.id!);
    const speakers = repo.getSpeakersByMeeting(meeting.id!);
    
    const duration = meeting.duration_minutes || 60;
    const attendees = speakers.length || 1;
    
    const actionsPerAttendee = attendees > 0 ? stats.actions / attendees : 0;
    const decisionsPerHour = duration > 0 ? (stats.decisions / duration) * 60 : 0;
    
    // Calculate effectiveness score (0-100)
    let score = 50; // Base score
    
    // Positive factors
    if (stats.actions > 0) score += 10;
    if (stats.decisions > 0) score += 10;
    if (actionsPerAttendee >= 1) score += 10;
    if (decisionsPerHour >= 1) score += 10;
    if (stats.risks > 0) score += 5; // Risk identification is good
    
    // Negative factors
    if (stats.actions === 0 && stats.decisions === 0) score -= 20;
    if (duration > 120) score -= 10; // Long meetings
    if (actionsPerAttendee > 5) score -= 10; // Too many actions per person
    
    score = Math.max(0, Math.min(100, score));
    
    const insights: string[] = [];
    if (score >= 80) insights.push('Highly effective meeting');
    else if (score >= 60) insights.push('Moderately effective meeting');
    else insights.push('Low effectiveness - consider improvements');
    
    if (stats.actions === 0) insights.push('No action items generated');
    if (stats.decisions === 0) insights.push('No decisions made');
    if (actionsPerAttendee > 5) insights.push('High action item load per attendee');
    if (duration > 120) insights.push('Consider shorter meetings');
    if (stats.risks > 3) insights.push('Multiple risks identified - follow up needed');
    
    return {
      meetingId: meeting.id!,
      title: meeting.title,
      date: meeting.meeting_date,
      type: meeting.meeting_type,
      duration: meeting.duration_minutes,
      attendees,
      actionsPerAttendee,
      decisionsPerHour,
      risksIdentified: stats.risks,
      effectivenessScore: score,
      insights
    };
  }).sort((a, b) => b.effectivenessScore - a.effectivenessScore);
}

// ============================================================================
// PREDICTIVE INSIGHTS
// ============================================================================

/**
 * Generate predictive insights and recommendations
 */
export function generatePredictiveInsights(): PredictiveInsights {
  const insights: PredictiveInsights = {
    atRiskActions: [],
    overloadedOwners: [],
    trendingRisks: [],
    recommendations: []
  };
  
  // Identify at-risk actions
  const pendingActions = repo.getPendingActions();
  pendingActions.forEach(action => {
    const riskScore = calculateActionRiskScore(action);
    if (riskScore > 50) {
      const reasons: string[] = [];
      
      if (action.due_date && new Date(action.due_date) < new Date()) {
        reasons.push('Overdue');
      } else if (action.due_date) {
        const daysUntilDue = Math.ceil((new Date(action.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 3) reasons.push('Due soon');
      }
      
      if (action.confidence && action.confidence < 0.7) {
        reasons.push('Low confidence extraction');
      }
      
      if (action.priority === 'critical' || action.priority === 'high') {
        reasons.push('High priority');
      }
      
      insights.atRiskActions.push({ action, riskScore, reasons });
    }
  });
  
  // Identify overloaded owners
  const teamMetrics = analyzeTeamMetrics();
  teamMetrics.forEach(metrics => {
    if (metrics.pendingActions > 10 || metrics.workloadTrend === 'increasing') {
      insights.overloadedOwners.push({
        owner: metrics.owner,
        currentLoad: metrics.pendingActions,
        recommendedAction: metrics.pendingActions > 15 
          ? 'Redistribute tasks immediately'
          : 'Monitor workload closely'
      });
    }
  });
  
  // Generate recommendations
  if (insights.atRiskActions.length > 0) {
    insights.recommendations.push(`${insights.atRiskActions.length} action(s) at risk of missing deadline`);
  }
  
  if (insights.overloadedOwners.length > 0) {
    insights.recommendations.push(`${insights.overloadedOwners.length} team member(s) overloaded`);
  }
  
  const highRisks = repo.getHighSeverityRisks();
  if (highRisks.length > 5) {
    insights.recommendations.push('High number of unresolved risks - prioritize mitigation');
  }
  
  const completionStats = getActionCompletionStats();
  if (completionStats.completionRate < 50) {
    insights.recommendations.push('Low action completion rate - review processes');
  }
  
  return insights;
}

/**
 * Calculate risk score for an action (0-100)
 */
function calculateActionRiskScore(action: repo.Action): number {
  let score = 0;
  
  // Due date factor
  if (action.due_date) {
    const daysUntilDue = Math.ceil((new Date(action.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue < 0) score += 50; // Overdue
    else if (daysUntilDue <= 3) score += 30; // Due soon
    else if (daysUntilDue <= 7) score += 15;
  }
  
  // Priority factor
  if (action.priority === 'critical') score += 30;
  else if (action.priority === 'high') score += 20;
  else if (action.priority === 'medium') score += 10;
  
  // Confidence factor
  if (action.confidence && action.confidence < 0.7) score += 20;
  
  return Math.min(100, score);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Group items by week
 */
function groupByWeek(items: any[], days: number) {
  const weeks: Array<{ period: string; actions: any[] }> = [];
  const now = new Date();
  
  const numWeeks = Math.ceil(days / 7);
  
  for (let i = 0; i < numWeeks; i++) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    
    const weekItems = items.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= weekStart && itemDate < weekEnd;
    });
    
    weeks.unshift({
      period: `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`,
      actions: weekItems
    });
  }
  
  return weeks;
}

/**
 * Calculate period-over-period changes
 */
function calculateChanges(data: TrendData[]) {
  for (let i = 1; i < data.length; i++) {
    const current = data[i].value;
    const previous = data[i - 1].value;
    
    data[i].change = current - previous;
    data[i].changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }
}
// ============================================================================
// NEW ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get risk trends with recurring risk detection
 */
export function getRiskTrends(days: number = 30): {
  trends: RiskTrends;
  recurringRisks: Array<{
    summary: string;
    occurrences: number;
    severity: string;
    meetings: number[];
  }>;
  resolutionRates: {
    overall: number;
    bySeverity: Record<string, number>;
  };
  statusChanges: Array<{
    riskId: number;
    summary: string;
    previousStatus: string;
    currentStatus: string;
    changedAt: string;
  }>;
} {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Get all risks in the period
  const allRisks = repo.db.prepare(`
    SELECT * FROM risks 
    WHERE created_at >= ? 
    ORDER BY created_at
  `).all(cutoffDate.toISOString()) as repo.Risk[];
  
  // Analyze trends
  const trends = analyzeRiskTrends(days);
  
  // Detect recurring risks using similarity detection
  const recurringRisks = detectRecurringRisks(allRisks);
  
  // Calculate resolution rates
  const resolutionRates = calculateRiskResolutionRates(allRisks);
  
  // Track status changes (simulated - in real app would need audit table)
  const statusChanges: Array<{
    riskId: number;
    summary: string;
    previousStatus: string;
    currentStatus: string;
    changedAt: string;
  }> = [];
  
  return {
    trends,
    recurringRisks,
    resolutionRates,
    statusChanges
  };
}

/**
 * Get decision timeline with implementation status
 */
export function getDecisionTimeline(days: number = 30): Array<{
  decision: repo.Decision;
  meeting?: repo.Meeting;
  implementationStatus: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  relatedActions: repo.Action[];
  stakeholders: string[];
  daysOld: number;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const decisions = repo.db.prepare(`
    SELECT * FROM decisions 
    WHERE created_at >= ? 
    ORDER BY created_at DESC
  `).all(cutoffDate.toISOString()) as repo.Decision[];
  
  return decisions.map(decision => {
    const meeting = decision.meeting_id ? repo.getMeeting(decision.meeting_id) : undefined;
    
    // Get related actions (actions from same meeting or mentioning decision keywords)
    const relatedActions = decision.meeting_id 
      ? repo.db.prepare(`
          SELECT * FROM actions 
          WHERE meeting_id = ?
        `).all(decision.meeting_id) as repo.Action[]
      : [];
    
    // Determine implementation status based on related actions
    let implementationStatus: 'not_started' | 'in_progress' | 'completed' | 'blocked' = 'not_started';
    if (relatedActions.length > 0) {
      const completedCount = relatedActions.filter(a => a.status === 'completed').length;
      const inProgressCount = relatedActions.filter(a => a.status === 'in_progress').length;
      const overdueCount = relatedActions.filter(a => 
        a.due_date && new Date(a.due_date) < new Date() && a.status === 'pending'
      ).length;
      
      if (completedCount === relatedActions.length) {
        implementationStatus = 'completed';
      } else if (overdueCount > 0) {
        implementationStatus = 'blocked';
      } else if (inProgressCount > 0 || completedCount > 0) {
        implementationStatus = 'in_progress';
      }
    }
    
    // Parse stakeholders
    const stakeholders = decision.stakeholders 
      ? JSON.parse(decision.stakeholders) 
      : [];
    
    // Calculate days old
    const daysOld = Math.floor(
      (Date.now() - new Date(decision.created_at!).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return {
      decision,
      meeting,
      implementationStatus,
      relatedActions,
      stakeholders,
      daysOld
    };
  });
}

/**
 * Get action completion rates with detailed breakdown
 */
export function getActionCompletionRates(days: number = 30): {
  overall: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    completionRate: number;
  };
  byOwner: Array<{
    owner: string;
    total: number;
    completed: number;
    completionRate: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  trends: Array<{
    period: string;
    completionRate: number;
    totalActions: number;
    completedActions: number;
  }>;
  bottlenecks: Array<{
    owner: string;
    pendingActions: number;
    overdueActions: number;
    completionRate: number;
  }>;
} {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Overall stats
  const overall = getActionCompletionStats();
  
  // By owner
  const ownerWorkload = getOwnerWorkload();
  const byOwner = ownerWorkload.map(w => {
    // Calculate trend by comparing recent vs older completion rates
    const recentActions = repo.db.prepare(`
      SELECT * FROM actions 
      WHERE owner = ? AND created_at >= ?
    `).all(w.owner, new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) as repo.Action[];
    
    const olderActions = repo.db.prepare(`
      SELECT * FROM actions 
      WHERE owner = ? AND created_at >= ? AND created_at < ?
    `).all(
      w.owner,
      cutoffDate.toISOString(),
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    ) as repo.Action[];
    
    const recentRate = recentActions.length > 0
      ? (recentActions.filter(a => a.status === 'completed').length / recentActions.length) * 100
      : 0;
    const olderRate = olderActions.length > 0
      ? (olderActions.filter(a => a.status === 'completed').length / olderActions.length) * 100
      : 0;
    
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentRate > olderRate + 10) trend = 'improving';
    else if (recentRate < olderRate - 10) trend = 'declining';
    
    return {
      owner: w.owner,
      total: w.totalActions,
      completed: w.completedActions,
      completionRate: w.completionRate,
      trend
    };
  });
  
  // Trends over time
  const allActions = repo.db.prepare(`
    SELECT * FROM actions 
    WHERE created_at >= ? 
    ORDER BY created_at
  `).all(cutoffDate.toISOString()) as repo.Action[];
  
  const weeklyData = groupByWeek(allActions, days);
  const trends = weeklyData.map(week => {
    const total = week.actions.length;
    const completed = week.actions.filter((a: repo.Action) => a.status === 'completed').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      period: week.period,
      completionRate,
      totalActions: total,
      completedActions: completed
    };
  });
  
  // Identify bottlenecks
  const bottlenecks = ownerWorkload
    .filter(w => w.completionRate < 50 || w.overdueActions > 2)
    .map(w => ({
      owner: w.owner,
      pendingActions: w.pendingActions,
      overdueActions: w.overdueActions,
      completionRate: w.completionRate
    }));
  
  return {
    overall,
    byOwner,
    trends,
    bottlenecks
  };
}

/**
 * Detect bottlenecks in the system
 */
export function detectBottlenecks(): {
  overloadedOwners: Array<{
    owner: string;
    activeActions: number;
    overdueActions: number;
    severity: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  staleActions: Array<{
    action: repo.Action;
    daysSinceCreation: number;
    owner: string;
  }>;
  highRiskWithoutOwners: repo.Risk[];
  overdueCriticalActions: Array<{
    action: repo.Action;
    daysOverdue: number;
    priority: string;
  }>;
  summary: {
    totalBottlenecks: number;
    criticalIssues: number;
    recommendations: string[];
  };
} {
  // Identify overloaded owners (>5 active actions)
  const ownerWorkload = getOwnerWorkload();
  const overloadedOwners = ownerWorkload
    .filter(w => w.pendingActions + w.inProgressActions > 5)
    .map(w => {
      const activeActions = w.pendingActions + w.inProgressActions;
      let severity: 'high' | 'medium' | 'low' = 'low';
      let recommendation = 'Monitor workload';
      
      if (activeActions > 15 || w.overdueActions > 5) {
        severity = 'high';
        recommendation = 'Redistribute tasks immediately - critical overload';
      } else if (activeActions > 10 || w.overdueActions > 3) {
        severity = 'medium';
        recommendation = 'Consider redistributing some tasks';
      }
      
      return {
        owner: w.owner,
        activeActions,
        overdueActions: w.overdueActions,
        severity,
        recommendation
      };
    });
  
  // Find stale actions (no updates in 7+ days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const staleActions = repo.db.prepare(`
    SELECT * FROM actions 
    WHERE status IN ('pending', 'in_progress') 
    AND updated_at < ?
    ORDER BY updated_at
  `).all(sevenDaysAgo) as repo.Action[];
  
  const staleActionsWithDays = staleActions.map(action => ({
    action,
    daysSinceCreation: Math.floor(
      (Date.now() - new Date(action.created_at!).getTime()) / (1000 * 60 * 60 * 24)
    ),
    owner: action.owner
  }));
  
  // Detect high-risk items without owners
  const highRiskWithoutOwners = repo.db.prepare(`
    SELECT * FROM risks 
    WHERE severity IN ('high', 'critical') 
    AND status != 'resolved'
    AND (owner_if_any IS NULL OR owner_if_any = '')
    ORDER BY severity DESC
  `).all() as repo.Risk[];
  
  // Flag overdue critical actions
  const today = new Date().toISOString().split('T')[0];
  const overdueCritical = repo.db.prepare(`
    SELECT * FROM actions 
    WHERE status = 'pending' 
    AND due_date < ? 
    AND priority IN ('critical', 'high')
    ORDER BY due_date
  `).all(today) as repo.Action[];
  
  const overdueCriticalActions = overdueCritical.map(action => ({
    action,
    daysOverdue: Math.floor(
      (Date.now() - new Date(action.due_date!).getTime()) / (1000 * 60 * 60 * 24)
    ),
    priority: action.priority || 'unknown'
  }));
  
  // Generate summary and recommendations
  const totalBottlenecks = 
    overloadedOwners.length + 
    staleActionsWithDays.length + 
    highRiskWithoutOwners.length + 
    overdueCriticalActions.length;
  
  const criticalIssues = 
    overloadedOwners.filter(o => o.severity === 'high').length +
    highRiskWithoutOwners.filter(r => r.severity === 'critical').length +
    overdueCriticalActions.filter(a => a.priority === 'critical').length;
  
  const recommendations: string[] = [];
  
  if (overloadedOwners.length > 0) {
    recommendations.push(`${overloadedOwners.length} team member(s) are overloaded - consider task redistribution`);
  }
  if (staleActionsWithDays.length > 0) {
    recommendations.push(`${staleActionsWithDays.length} action(s) have not been updated in 7+ days - follow up needed`);
  }
  if (highRiskWithoutOwners.length > 0) {
    recommendations.push(`${highRiskWithoutOwners.length} high-severity risk(s) lack assigned owners - assign immediately`);
  }
  if (overdueCriticalActions.length > 0) {
    recommendations.push(`${overdueCriticalActions.length} critical action(s) are overdue - escalate urgently`);
  }
  
  return {
    overloadedOwners,
    staleActions: staleActionsWithDays,
    highRiskWithoutOwners,
    overdueCriticalActions,
    summary: {
      totalBottlenecks,
      criticalIssues,
      recommendations
    }
  };
}

// ============================================================================
// ADDITIONAL HELPER FUNCTIONS
// ============================================================================

/**
 * Filter items by date range
 */
function filterByDateRange<T extends { created_at?: string }>(
  items: T[],
  startDate: Date,
  endDate: Date = new Date()
): T[] {
  return items.filter(item => {
    if (!item.created_at) return false;
    const itemDate = new Date(item.created_at);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

/**
 * Detect recurring risks using similarity detection
 */
function detectRecurringRisks(risks: repo.Risk[]): Array<{
  summary: string;
  occurrences: number;
  severity: string;
  meetings: number[];
}> {
  const riskGroups = new Map<string, {
    summary: string;
    occurrences: number;
    severity: string;
    meetings: number[];
  }>();
  
  risks.forEach(risk => {
    // Normalize summary for comparison
    const normalized = risk.summary.toLowerCase().trim();
    
    // Find similar risks (simple keyword matching)
    let foundGroup = false;
    for (const [key, group] of riskGroups.entries()) {
      if (calculateSimilarity(normalized, key) > 0.7) {
        group.occurrences++;
        if (risk.meeting_id) {
          group.meetings.push(risk.meeting_id);
        }
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      riskGroups.set(normalized, {
        summary: risk.summary,
        occurrences: 1,
        severity: risk.severity,
        meetings: risk.meeting_id ? [risk.meeting_id] : []
      });
    }
  });
  
  // Return only recurring risks (2+ occurrences)
  return Array.from(riskGroups.values())
    .filter(group => group.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Calculate risk resolution rates
 */
function calculateRiskResolutionRates(risks: repo.Risk[]): {
  overall: number;
  bySeverity: Record<string, number>;
} {
  const total = risks.length;
  const resolved = risks.filter(r => r.status === 'resolved').length;
  const overall = total > 0 ? (resolved / total) * 100 : 0;
  
  const bySeverity: Record<string, number> = {};
  const severities = ['low', 'med', 'high', 'critical'];
  
  severities.forEach(severity => {
    const severityRisks = risks.filter(r => r.severity === severity);
    const severityResolved = severityRisks.filter(r => r.status === 'resolved').length;
    bySeverity[severity] = severityRisks.length > 0 
      ? (severityResolved / severityRisks.length) * 100 
      : 0;
  });
  
  return { overall, bySeverity };
}

/**
 * Calculate statistical mean
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate statistical median
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate percentile
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Detect trend pattern (increasing/decreasing/stable)
 */
function detectTrendPattern(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  let increases = 0;
  let decreases = 0;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) increases++;
    else if (values[i] < values[i - 1]) decreases++;
  }
  
  const threshold = values.length * 0.6; // 60% threshold
  
  if (increases >= threshold) return 'increasing';
  if (decreases >= threshold) return 'decreasing';
  return 'stable';
}


/**
 * Get comprehensive analytics summary
 */
export function getAnalyticsSummary(days: number = 30) {
  return {
    actionTrends: analyzeActionTrends(days),
    actionStats: getActionCompletionStats(),
    actionCompletionRates: getActionCompletionRates(days),
    decisionTrends: analyzeDecisionTrends(days),
    decisionImpact: getDecisionImpactDistribution(),
    decisionTimeline: getDecisionTimeline(days),
    riskTrends: getRiskTrends(days),
    riskDistribution: getRiskSeverityDistribution(),
    teamMetrics: analyzeTeamMetrics(),
    teamBalance: getTeamWorkloadBalance(),
    ownerWorkload: getOwnerWorkload(),
    meetingEffectiveness: analyzeMeetingEffectiveness(),
    predictiveInsights: generatePredictiveInsights(),
    bottlenecks: detectBottlenecks(),
    generatedAt: new Date().toISOString()
  };
}

// Made with Bob
