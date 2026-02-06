/**
 * Document Generation Service
 * 
 * Generates professional documents from meeting data:
 * - Meeting minutes (Markdown/HTML)
 * - Action item reports
 * - Risk assessment reports
 * - Project status updates
 * - Executive summaries
 */

import * as repo from '../db/repo.js';

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentOptions {
  format?: 'markdown' | 'html' | 'text';
  includeTranscript?: boolean;
  includeTimestamps?: boolean;
  includeConfidence?: boolean;
  template?: 'formal' | 'casual' | 'executive';
}

export interface MeetingMinutesData {
  meeting: repo.Meeting;
  speakers: repo.Speaker[];
  transcript?: repo.TranscriptSegment[];
  actions: repo.Action[];
  decisions: repo.Decision[];
  risks: repo.Risk[];
  stats: {
    actions: number;
    decisions: number;
    risks: number;
    speakers: number;
  };
}

// ============================================================================
// MEETING MINUTES GENERATION
// ============================================================================

/**
 * Generate comprehensive meeting minutes
 */
export async function generateMeetingMinutes(
  meetingId: number,
  options: DocumentOptions = {}
): Promise<string> {
  // Validate meeting ID first
  validateMeetingId(meetingId);
  
  const {
    format = 'markdown',
    includeTranscript = false,
    includeTimestamps = true,
    template = 'formal'
  } = options;

  // Gather all meeting data
  const meeting = repo.getMeeting(meetingId);
  if (!meeting) {
    throw new Error(`Meeting ${meetingId} not found`);
  }

  try {
    const speakers = repo.getSpeakersByMeeting(meetingId);
    const transcript = includeTranscript ? repo.getTranscriptByMeeting(meetingId) : [];
    const actions = repo.db.prepare('SELECT * FROM actions WHERE meeting_id = ?').all(meetingId) as repo.Action[];
    const decisions = repo.db.prepare('SELECT * FROM decisions WHERE meeting_id = ?').all(meetingId) as repo.Decision[];
    const risks = repo.db.prepare('SELECT * FROM risks WHERE meeting_id = ?').all(meetingId) as repo.Risk[];
    const stats = repo.getMeetingStats(meetingId);

    const data: MeetingMinutesData = {
      meeting,
      speakers,
      transcript,
      actions,
      decisions,
      risks,
      stats
    };

    switch (format) {
      case 'html':
        return generateHTMLMinutes(data, template, includeTimestamps);
      case 'text':
        return generateTextMinutes(data, template, includeTimestamps);
      case 'markdown':
      default:
        return generateMarkdownMinutes(data, template, includeTimestamps);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw error;
    }
    throw new Error(`Failed to generate meeting minutes for meeting ${meetingId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate Markdown meeting minutes
 */
function generateMarkdownMinutes(
  data: MeetingMinutesData,
  template: string,
  includeTimestamps: boolean
): string {
  const { meeting, speakers, transcript, actions, decisions, risks, stats } = data;
  
  const lines: string[] = [];
  
  // Header
  lines.push(`# Meeting Minutes: ${meeting.title}`);
  lines.push('');
  
  // Metadata
  lines.push('## Meeting Information');
  lines.push('');
  lines.push(`- **Date:** ${formatDate(meeting.meeting_date)}`);
  lines.push(`- **Type:** ${formatMeetingType(meeting.meeting_type)}`);
  if (meeting.duration_minutes) {
    lines.push(`- **Duration:** ${meeting.duration_minutes} minutes`);
  }
  if (meeting.location) {
    lines.push(`- **Location:** ${meeting.location}`);
  }
  lines.push(`- **Status:** ${formatStatus(meeting.status)}`);
  lines.push('');
  
  // Attendees
  if (speakers.length > 0) {
    lines.push('## Attendees');
    lines.push('');
    speakers.forEach(speaker => {
      const name = speaker.speaker_name || speaker.speaker_label;
      const role = speaker.role ? ` (${speaker.role})` : '';
      const time = speaker.total_speaking_time_seconds 
        ? ` - ${formatDuration(speaker.total_speaking_time_seconds)}`
        : '';
      lines.push(`- ${name}${role}${time}`);
    });
    lines.push('');
  }
  
  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`This ${formatMeetingType(meeting.meeting_type).toLowerCase()} resulted in:`);
  lines.push(`- ${stats.actions} action item${stats.actions !== 1 ? 's' : ''}`);
  lines.push(`- ${stats.decisions} decision${stats.decisions !== 1 ? 's' : ''}`);
  lines.push(`- ${stats.risks} risk${stats.risks !== 1 ? 's' : ''} identified`);
  lines.push('');
  
  // Decisions
  if (decisions.length > 0) {
    lines.push('## Decisions Made');
    lines.push('');
    decisions.forEach((decision, idx) => {
      lines.push(`### ${idx + 1}. ${decision.summary}`);
      if (decision.rationale) {
        lines.push('');
        lines.push(`**Rationale:** ${decision.rationale}`);
      }
      if (decision.impact) {
        lines.push('');
        lines.push(`**Impact:** ${formatImpact(decision.impact)}`);
      }
      if (decision.stakeholders) {
        const stakeholders = safeJsonParse<string[]>(decision.stakeholders, []);
        if (Array.isArray(stakeholders) && stakeholders.length > 0) {
          lines.push('');
          lines.push(`**Stakeholders:** ${formatList(stakeholders)}`);
        }
      }
      if (decision.date && includeTimestamps) {
        lines.push('');
        lines.push(`*Decided on: ${formatDate(decision.date)}*`);
      }
      lines.push('');
    });
  }
  
  // Action Items
  if (actions.length > 0) {
    lines.push('## Action Items');
    lines.push('');
    
    // Group by status
    const pending = actions.filter(a => a.status === 'pending');
    const inProgress = actions.filter(a => a.status === 'in_progress');
    const completed = actions.filter(a => a.status === 'completed');
    
    if (pending.length > 0) {
      lines.push('### Pending');
      lines.push('');
      pending.forEach((action, idx) => {
        lines.push(`${idx + 1}. **${action.owner}**: ${action.description}`);
        if (action.due_date) {
          const relativeDate = formatRelativeDate(action.due_date);
          lines.push(`   - Due: ${formatDate(action.due_date)} (${relativeDate})`);
        }
        if (action.priority) {
          lines.push(`   - Priority: ${formatPriority(action.priority)}`);
        }
        if (action.confidence) {
          lines.push(`   - Confidence: ${formatConfidenceScore(action.confidence)}`);
        }
      });
      lines.push('');
    }
    
    if (inProgress.length > 0) {
      lines.push('### In Progress');
      lines.push('');
      inProgress.forEach((action, idx) => {
        lines.push(`${idx + 1}. **${action.owner}**: ${action.description}`);
        if (action.due_date) {
          lines.push(`   - Due: ${formatDate(action.due_date)}`);
        }
      });
      lines.push('');
    }
    
    if (completed.length > 0) {
      lines.push('### Completed');
      lines.push('');
      completed.forEach((action, idx) => {
        lines.push(`${idx + 1}. ~~${action.owner}: ${action.description}~~`);
      });
      lines.push('');
    }
  }
  
  // Risks
  if (risks.length > 0) {
    lines.push('## Risks & Issues');
    lines.push('');
    
    // Sort by severity
    const sortedRisks = [...risks].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, med: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    sortedRisks.forEach((risk, idx) => {
      const icon = getSeverityIcon(risk.severity);
      lines.push(`### ${idx + 1}. ${icon} ${risk.summary}`);
      lines.push('');
      lines.push(`**Severity:** ${formatSeverity(risk.severity)}`);
      if (risk.owner_if_any) {
        lines.push(`**Owner:** ${risk.owner_if_any}`);
      }
      lines.push(`**Status:** ${formatRiskStatus(risk.status)}`);
      if (risk.mitigation_plan) {
        lines.push('');
        lines.push(`**Mitigation Plan:**`);
        lines.push(risk.mitigation_plan);
      }
      lines.push('');
    });
  }
  
  // Transcript (optional)
  if (transcript && transcript.length > 0) {
    lines.push('## Transcript');
    lines.push('');
    
    transcript.forEach(segment => {
      const speaker = speakers.find(s => s.id === segment.speaker_id);
      const speakerName = speaker?.speaker_name || speaker?.speaker_label || 'Unknown';
      const timestamp = includeTimestamps ? `[${formatTimestamp(segment.start_time)}] ` : '';
      
      lines.push(`**${timestamp}${speakerName}:** ${segment.text}`);
      lines.push('');
    });
  }
  
  // Footer
  if (includeTimestamps) {
    lines.push('---');
    lines.push('');
    lines.push(`*Generated on ${new Date().toISOString()}*`);
  }
  
  return lines.join('\n');
}

/**
 * Generate HTML meeting minutes
 */
function generateHTMLMinutes(
  data: MeetingMinutesData,
  template: string,
  includeTimestamps: boolean
): string {
  const markdown = generateMarkdownMinutes(data, template, includeTimestamps);
  
  // Simple Markdown to HTML conversion
  let html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Meeting Minutes: ${data.meeting.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; border-bottom: 2px solid #ecf0f1; padding-bottom: 5px; }
    h3 { color: #7f8c8d; }
    li { margin: 5px 0; }
    strong { color: #2c3e50; }
    .metadata { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .risk-critical { color: #e74c3c; }
    .risk-high { color: #e67e22; }
    .risk-med { color: #f39c12; }
    .risk-low { color: #27ae60; }
  </style>
</head>
<body>
  ${html}
</body>
</html>
  `.trim();
}

/**
 * Generate plain text meeting minutes
 */
function generateTextMinutes(
  data: MeetingMinutesData,
  template: string,
  includeTimestamps: boolean
): string {
  const markdown = generateMarkdownMinutes(data, template, includeTimestamps);
  
  // Strip Markdown formatting
  return markdown
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/^---$/gm, '----------------------------------------');
}

// ============================================================================
// ACTION ITEM REPORT
// ============================================================================

/**
 * Generate action item report for a specific owner or all owners
 */
export function generateActionItemReport(owner?: string): string {
  return generateActionReport(owner);
}

/**
 * Generate action item report for a specific owner or all owners
 * @deprecated Use generateActionItemReport instead
 */
export function generateActionReport(owner?: string): string {
  try {
    const lines: string[] = [];
    
    lines.push('# Action Item Report');
    lines.push('');
    lines.push(`Generated: ${formatDate(new Date().toISOString())}`);
    lines.push('');
    
    if (owner) {
      if (!owner.trim()) {
        throw new Error('Owner name cannot be empty');
      }
      
      const actions = repo.getActionsByOwner(owner);
      lines.push(`## Actions for ${owner}`);
      lines.push('');
      
      if (actions.length === 0) {
        lines.push('No actions found for this owner.');
        lines.push('');
      } else {
        lines.push(`Total: ${actions.length}`);
        lines.push('');
        formatActionList(actions, lines);
      }
    } else {
      const workload = repo.getOwnerWorkload();
      
      lines.push('## Workload by Owner');
      lines.push('');
      
      if (workload.length === 0) {
        lines.push('No active actions found.');
        lines.push('');
      } else {
        workload.forEach(w => {
          lines.push(`### ${w.owner}`);
          lines.push(`- Pending: ${w.pending}`);
          lines.push(`- In Progress: ${w.in_progress}`);
          lines.push(`- Total: ${w.total}`);
          lines.push('');
        });
      }
      
      const overdue = repo.getOverdueActions();
      if (overdue.length > 0) {
        lines.push('## ⚠️ Overdue Actions');
        lines.push('');
        lines.push(`${overdue.length} action(s) require immediate attention.`);
        lines.push('');
        formatActionList(overdue, lines);
      }
    }
    
    return lines.join('\n');
  } catch (error) {
    throw new Error(`Failed to generate action item report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function formatActionList(actions: repo.Action[], lines: string[]): void {
  actions.forEach((action, idx) => {
    lines.push(`${idx + 1}. **${action.owner}**: ${action.description}`);
    if (action.due_date) {
      const isOverdue = new Date(action.due_date) < new Date();
      const dueLabel = isOverdue ? '⚠️ OVERDUE' : 'Due';
      lines.push(`   - ${dueLabel}: ${formatDate(action.due_date)}`);
    }
    if (action.priority) {
      lines.push(`   - Priority: ${formatPriority(action.priority)}`);
    }
    lines.push(`   - Status: ${formatStatus(action.status)}`);
    lines.push('');
  });
}

// ============================================================================
// RISK ASSESSMENT REPORT
// ============================================================================

/**
 * Generate risk assessment report
 */
export function generateRiskAssessmentReport(): string {
  return generateRiskReport();
}

/**
 * Generate risk assessment report
 * @deprecated Use generateRiskAssessmentReport instead
 */
export function generateRiskReport(): string {
  try {
    const lines: string[] = [];
    
    lines.push('# Risk Assessment Report');
    lines.push('');
    lines.push(`Generated: ${formatDate(new Date().toISOString())}`);
    lines.push('');
    
    const highRisks = repo.getHighSeverityRisks();
    
    lines.push('## High Severity Risks');
    lines.push('');
    lines.push(`Total: ${highRisks.length}`);
    lines.push('');
    
    if (highRisks.length === 0) {
      lines.push('✅ No high severity risks identified.');
      lines.push('');
    } else {
      highRisks.forEach((risk, idx) => {
        const icon = getSeverityIcon(risk.severity);
        lines.push(`### ${idx + 1}. ${icon} ${risk.summary}`);
        lines.push('');
        lines.push(`**Severity:** ${formatSeverity(risk.severity)}`);
        lines.push(`**Status:** ${formatRiskStatus(risk.status)}`);
        if (risk.owner_if_any) {
          lines.push(`**Owner:** ${risk.owner_if_any}`);
        }
        if (risk.mitigation_plan) {
          lines.push('');
          lines.push(`**Mitigation Plan:**`);
          lines.push(risk.mitigation_plan);
        }
        if (risk.created_at) {
          lines.push('');
          lines.push(`*Identified: ${formatDate(risk.created_at)}*`);
        }
        lines.push('');
      });
    }
    
    // Add summary statistics
    const allRisks = repo.db.prepare('SELECT * FROM risks').all() as repo.Risk[];
    if (allRisks.length > 0) {
      lines.push('## Overall Risk Statistics');
      lines.push('');
      
      const bySeverity = {
        critical: allRisks.filter(r => r.severity === 'critical').length,
        high: allRisks.filter(r => r.severity === 'high').length,
        med: allRisks.filter(r => r.severity === 'med').length,
        low: allRisks.filter(r => r.severity === 'low').length
      };
      
      const byStatus = {
        identified: allRisks.filter(r => r.status === 'identified').length,
        mitigating: allRisks.filter(r => r.status === 'mitigating').length,
        resolved: allRisks.filter(r => r.status === 'resolved').length,
        accepted: allRisks.filter(r => r.status === 'accepted').length
      };
      
      lines.push(`- **Total Risks:** ${allRisks.length}`);
      lines.push(`- **By Severity:** Critical: ${bySeverity.critical}, High: ${bySeverity.high}, Medium: ${bySeverity.med}, Low: ${bySeverity.low}`);
      lines.push(`- **By Status:** Identified: ${byStatus.identified}, Mitigating: ${byStatus.mitigating}, Resolved: ${byStatus.resolved}, Accepted: ${byStatus.accepted}`);
      lines.push('');
    }
    
    return lines.join('\n');
  } catch (error) {
    throw new Error(`Failed to generate risk assessment report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// EXECUTIVE SUMMARY
// ============================================================================

/**
 * Generate executive summary across multiple meetings
 */
export function generateExecutiveSummary(meetingIds: number[]): string {
  try {
    // Validate input
    if (!meetingIds || !Array.isArray(meetingIds)) {
      throw new Error('Meeting IDs must be provided as an array');
    }
    
    if (meetingIds.length === 0) {
      throw new Error('At least one meeting ID must be provided');
    }
    
    // Validate each meeting ID
    const validMeetingIds: number[] = [];
    const invalidMeetingIds: number[] = [];
    
    meetingIds.forEach(id => {
      try {
        validateMeetingId(id);
        validMeetingIds.push(id);
      } catch (e) {
        invalidMeetingIds.push(id);
      }
    });
    
    if (validMeetingIds.length === 0) {
      throw new Error('No valid meeting IDs found');
    }
    
    const lines: string[] = [];
    
    lines.push('# Executive Summary');
    lines.push('');
    lines.push(`Generated: ${formatDate(new Date().toISOString())}`);
    lines.push(`Meetings Analyzed: ${validMeetingIds.length}`);
    
    if (invalidMeetingIds.length > 0) {
      lines.push(`⚠️ Invalid/Not Found: ${invalidMeetingIds.length}`);
    }
    lines.push('');
    
    let totalActions = 0;
    let totalDecisions = 0;
    let totalRisks = 0;
    let totalSpeakers = 0;
    
    validMeetingIds.forEach(id => {
      const stats = repo.getMeetingStats(id);
      totalActions += stats.actions;
      totalDecisions += stats.decisions;
      totalRisks += stats.risks;
      totalSpeakers += stats.speakers;
    });
    
    lines.push('## Key Metrics');
    lines.push('');
    lines.push(`- **Total Actions:** ${totalActions}`);
    lines.push(`- **Total Decisions:** ${totalDecisions}`);
    lines.push(`- **Total Risks:** ${totalRisks}`);
    lines.push(`- **Total Participants:** ${totalSpeakers}`);
    lines.push('');
    
    const pendingActions = repo.getPendingActions();
    const overdueActions = repo.getOverdueActions();
    const highRisks = repo.getHighSeverityRisks();
    
    lines.push('## Status Overview');
    lines.push('');
    lines.push(`- **Pending Actions:** ${pendingActions.length}`);
    lines.push(`- **Overdue Actions:** ${overdueActions.length}`);
    lines.push(`- **High Severity Risks:** ${highRisks.length}`);
    lines.push('');
    
    if (overdueActions.length > 0) {
      lines.push('## ⚠️ Attention Required');
      lines.push('');
      lines.push(`${overdueActions.length} action(s) are overdue and require immediate attention.`);
      lines.push('');
      
      // Show top 5 overdue actions
      overdueActions.slice(0, 5).forEach((action, idx) => {
        const daysOverdue = Math.abs(daysUntil(action.due_date || ''));
        lines.push(`${idx + 1}. **${action.owner}**: ${action.description} (${daysOverdue} days overdue)`);
      });
      lines.push('');
    }
    
    if (highRisks.length > 0) {
      lines.push('## 🔴 Critical Risks');
      lines.push('');
      highRisks.slice(0, 5).forEach((risk, idx) => {
        const owner = risk.owner_if_any ? ` - Owner: ${risk.owner_if_any}` : '';
        lines.push(`${idx + 1}. ${risk.summary} (${formatSeverity(risk.severity)})${owner}`);
      });
      
      if (highRisks.length > 5) {
        lines.push(`\n*...and ${highRisks.length - 5} more high severity risks*`);
      }
      lines.push('');
    }
    
    const workload = repo.getOwnerWorkload();
    if (workload.length > 0) {
      lines.push('## Team Workload');
      lines.push('');
      
      // Calculate total workload
      const totalWorkload = workload.reduce((sum, w) => sum + w.total, 0);
      lines.push(`Total Active Items: ${totalWorkload}`);
      lines.push('');
      
      workload.slice(0, 10).forEach(w => {
        const percentage = totalWorkload > 0 ? Math.round((w.total / totalWorkload) * 100) : 0;
        lines.push(`- **${w.owner}**: ${w.total} items (${percentage}%) - ${w.pending} pending, ${w.in_progress} in progress`);
      });
      
      if (workload.length > 10) {
        lines.push(`\n*...and ${workload.length - 10} more team members*`);
      }
      lines.push('');
    }
    
    // Add meeting details section
    if (validMeetingIds.length > 0) {
      lines.push('## Meetings Included');
      lines.push('');
      validMeetingIds.slice(0, 10).forEach(id => {
        const meeting = repo.getMeeting(id);
        if (meeting) {
          lines.push(`- **${meeting.title}** (${formatDate(meeting.meeting_date)}) - ${formatMeetingType(meeting.meeting_type)}`);
        }
      });
      
      if (validMeetingIds.length > 10) {
        lines.push(`\n*...and ${validMeetingIds.length - 10} more meetings*`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  } catch (error) {
    throw new Error(`Failed to generate executive summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format confidence score as percentage with visual indicator
 */
export function formatConfidenceScore(confidence: number): string {
  const percentage = Math.round(confidence * 100);
  let indicator = '';
  
  if (percentage >= 90) {
    indicator = '✅';
  } else if (percentage >= 75) {
    indicator = '✓';
  } else if (percentage >= 60) {
    indicator = '⚠️';
  } else {
    indicator = '❌';
  }
  
  return `${indicator} ${percentage}%`;
}

/**
 * Calculate and format statistics for a collection of items
 */
export function calculateStatistics(items: any[], field: string): {
  total: number;
  average: number;
  min: number;
  max: number;
} {
  if (!items || items.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0 };
  }
  
  const values = items
    .map(item => item[field])
    .filter(val => typeof val === 'number' && !isNaN(val));
  
  if (values.length === 0) {
    return { total: items.length, average: 0, min: 0, max: 0 };
  }
  
  const total = items.length;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return { total, average, min, max };
}

/**
 * Format statistics as a readable string
 */
export function formatStatistics(stats: {
  total: number;
  average: number;
  min: number;
  max: number;
}): string {
  return `Total: ${stats.total}, Avg: ${stats.average.toFixed(2)}, Min: ${stats.min}, Max: ${stats.max}`;
}

/**
 * Validate meeting ID and throw error if invalid
 */
function validateMeetingId(meetingId: number): void {
  if (!meetingId || typeof meetingId !== 'number' || meetingId <= 0) {
    throw new Error(`Invalid meeting ID: ${meetingId}`);
  }
  
  const meeting = repo.getMeeting(meetingId);
  if (!meeting) {
    throw new Error(`Meeting with ID ${meetingId} not found`);
  }
}

/**
 * Format date with error handling
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s speaking time`;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatMeetingType(type: string): string {
  const types: Record<string, string> = {
    standup: 'Daily Standup',
    planning: 'Planning Meeting',
    retrospective: 'Retrospective',
    client: 'Client Meeting',
    other: 'Meeting'
  };
  return types[type] || type;
}

function formatStatus(status: string): string {
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatPriority(priority: string): string {
  const icons: Record<string, string> = {
    critical: '🔴 Critical',
    high: '🟠 High',
    medium: '🟡 Medium',
    low: '🟢 Low'
  };
  return icons[priority] || priority;
}

function formatSeverity(severity: string): string {
  const labels: Record<string, string> = {
    critical: '🔴 Critical',
    high: '🟠 High',
    med: '🟡 Medium',
    low: '🟢 Low'
  };
  return labels[severity] || severity;
}

function formatImpact(impact: string): string {
  const labels: Record<string, string> = {
    high: '🔴 High Impact',
    medium: '🟡 Medium Impact',
    low: '🟢 Low Impact'
  };
  return labels[impact] || impact;
}

function formatRiskStatus(status: string): string {
  const labels: Record<string, string> = {
    identified: '🔍 Identified',
    mitigating: '🔧 Mitigating',
    resolved: '✅ Resolved',
    accepted: '⚠️ Accepted'
  };
  return labels[status] || status;
}

function getSeverityIcon(severity: string): string {
  const icons: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    med: '🟡',
    low: '🟢'
  };
  return icons[severity] || '⚪';
}

/**
 * Safe JSON parse with fallback
 */
function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    return fallback;
  }
}

/**
 * Format a list of items with proper grammar
 */
function formatList(items: string[]): string {
  if (items.length === 0) return 'none';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  
  const last = items[items.length - 1];
  const rest = items.slice(0, -1);
  return `${rest.join(', ')}, and ${last}`;
}

/**
 * Calculate days until a date
 */
function daysUntil(dateStr: string): number {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Format relative date (e.g., "in 3 days", "2 days ago")
 */
function formatRelativeDate(dateStr: string): string {
  const days = daysUntil(dateStr);
  
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

// Made with Bob
