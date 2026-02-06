
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export const dbPath = path.resolve(process.cwd(), 'data/meeting.db');
export const dbDir  = path.dirname(dbPath);
export let db: Database.Database;

// ============================================================================
// TYPES
// ============================================================================

export interface Meeting {
  id?: number;
  title: string;
  meeting_type: 'standup' | 'planning' | 'retrospective' | 'client' | 'other';
  meeting_date: string; // ISO date
  duration_minutes?: number;
  location?: string;
  cos_audio_key?: string;
  cos_transcript_key?: string;
  language?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface Speaker {
  id?: number;
  meeting_id: number;
  speaker_label: string; // e.g., "Speaker 0", "Speaker 1"
  speaker_name?: string; // Optional human-readable name
  email?: string;
  role?: string;
  total_speaking_time_seconds?: number;
  created_at?: string;
}

export interface TranscriptSegment {
  id?: number;
  meeting_id: number;
  speaker_id?: number;
  text: string;
  start_time: number; // seconds
  end_time: number; // seconds
  confidence: number;
  sequence_number: number;
  created_at?: string;
}

export interface Action {
  id?: number;
  meeting_id?: number;
  owner: string;
  description: string;
  due_date?: string;
  confidence?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  created_at?: string;
  updated_at?: string;
}

export interface Decision {
  id?: number;
  meeting_id?: number;
  summary: string;
  rationale?: string;
  date?: string;
  impact?: 'low' | 'medium' | 'high';
  stakeholders?: string; // JSON array of names
  created_at?: string;
}

export interface Risk {
  id?: number;
  meeting_id?: number;
  summary: string;
  severity: 'low' | 'med' | 'high' | 'critical';
  owner_if_any?: string;
  mitigation_plan?: string;
  status: 'identified' | 'mitigating' | 'resolved' | 'accepted';
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function init() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  db = new Database(dbPath);
  
  db.exec(`
    -- Meetings table: Core meeting metadata
    CREATE TABLE IF NOT EXISTS meetings(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      meeting_type TEXT NOT NULL CHECK(meeting_type IN ('standup', 'planning', 'retrospective', 'client', 'other')),
      meeting_date TEXT NOT NULL,
      duration_minutes INTEGER,
      location TEXT,
      cos_audio_key TEXT,
      cos_transcript_key TEXT,
      audio_blob BLOB,
      audio_filename TEXT,
      audio_mimetype TEXT,
      language TEXT DEFAULT 'en-US',
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Speakers table: Track participants and their speaking patterns
    CREATE TABLE IF NOT EXISTS speakers(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      speaker_label TEXT NOT NULL,
      speaker_name TEXT,
      email TEXT,
      role TEXT,
      total_speaking_time_seconds REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      UNIQUE(meeting_id, speaker_label)
    );

    -- Transcript segments: Detailed transcription with speaker attribution
    CREATE TABLE IF NOT EXISTS transcript_segments(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      speaker_id INTEGER,
      text TEXT NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      confidence REAL NOT NULL,
      sequence_number INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE SET NULL
    );

    -- Actions table: Enhanced with meeting linkage and status tracking
    CREATE TABLE IF NOT EXISTS actions(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      owner TEXT NOT NULL,
      description TEXT NOT NULL,
      due_date TEXT,
      confidence REAL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL
    );

    -- Decisions table: Enhanced with impact and stakeholder tracking
    CREATE TABLE IF NOT EXISTS decisions(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      summary TEXT NOT NULL,
      rationale TEXT,
      date TEXT,
      impact TEXT CHECK(impact IN ('low', 'medium', 'high')),
      stakeholders TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL
    );

    -- Risks table: Enhanced with mitigation and status tracking
    CREATE TABLE IF NOT EXISTS risks(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      summary TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('low', 'med', 'high', 'critical')),
      owner_if_any TEXT,
      mitigation_plan TEXT,
      status TEXT NOT NULL DEFAULT 'identified' CHECK(status IN ('identified', 'mitigating', 'resolved', 'accepted')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL
    );

    -- Documents table: Store generated documents and files as BLOBs
    CREATE TABLE IF NOT EXISTS documents(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('minutes', 'report', 'transcript', 'summary', 'other')),
      filename TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      content BLOB NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
    CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(meeting_type);
    CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
    CREATE INDEX IF NOT EXISTS idx_speakers_meeting ON speakers(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_transcript_meeting ON transcript_segments(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_transcript_speaker ON transcript_segments(speaker_id);
    CREATE INDEX IF NOT EXISTS idx_actions_meeting ON actions(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_actions_owner ON actions(owner);
    CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
    CREATE INDEX IF NOT EXISTS idx_decisions_meeting ON decisions(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_risks_meeting ON risks(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity);
    CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
    CREATE INDEX IF NOT EXISTS idx_documents_meeting ON documents(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
  `);
}

// ============================================================================
// MEETING OPERATIONS
// ============================================================================

export function createMeeting(meeting: Meeting): number {
  const stmt = db.prepare(`
    INSERT INTO meetings(title, meeting_type, meeting_date, duration_minutes, location,
                        cos_audio_key, cos_transcript_key, language, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    meeting.title,
    meeting.meeting_type,
    meeting.meeting_date,
    meeting.duration_minutes ?? null,
    meeting.location ?? null,
    meeting.cos_audio_key ?? null,
    meeting.cos_transcript_key ?? null,
    meeting.language ?? 'en-US',
    meeting.status
  );
  
  return result.lastInsertRowid as number;
}

export function getMeeting(id: number): Meeting | undefined {
  const stmt = db.prepare('SELECT * FROM meetings WHERE id = ?');
  return stmt.get(id) as Meeting | undefined;
}

export function getAllMeetings(limit = 100, offset = 0): Meeting[] {
  const stmt = db.prepare('SELECT * FROM meetings ORDER BY meeting_date DESC LIMIT ? OFFSET ?');
  return stmt.all(limit, offset) as Meeting[];
}

export function updateMeeting(id: number, updates: Partial<Meeting>): void {
  const fields = Object.keys(updates).filter(k => k !== 'id');
  if (fields.length === 0) return;
  
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as any)[f]);
  
  const stmt = db.prepare(`UPDATE meetings SET ${setClause}, updated_at = datetime('now') WHERE id = ?`);
  stmt.run(...values, id);
}

export function deleteMeeting(id: number): void {
  const stmt = db.prepare('DELETE FROM meetings WHERE id = ?');
  stmt.run(id);
}

// ============================================================================
// SPEAKER OPERATIONS
// ============================================================================

export function createSpeaker(speaker: Speaker): number {
  const stmt = db.prepare(`
    INSERT INTO speakers(meeting_id, speaker_label, speaker_name, email, role, total_speaking_time_seconds)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    speaker.meeting_id,
    speaker.speaker_label,
    speaker.speaker_name ?? null,
    speaker.email ?? null,
    speaker.role ?? null,
    speaker.total_speaking_time_seconds ?? 0
  );
  
  return result.lastInsertRowid as number;
}

export function getSpeakersByMeeting(meetingId: number): Speaker[] {
  const stmt = db.prepare('SELECT * FROM speakers WHERE meeting_id = ? ORDER BY speaker_label');
  return stmt.all(meetingId) as Speaker[];
}

export function updateSpeaker(id: number, updates: Partial<Speaker>): void {
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'meeting_id');
  if (fields.length === 0) return;
  
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as any)[f]);
  
  const stmt = db.prepare(`UPDATE speakers SET ${setClause} WHERE id = ?`);
  stmt.run(...values, id);
}

// ============================================================================
// TRANSCRIPT OPERATIONS
// ============================================================================

export function createTranscriptSegment(segment: TranscriptSegment): number {
  const stmt = db.prepare(`
    INSERT INTO transcript_segments(meeting_id, speaker_id, text, start_time, end_time, confidence, sequence_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    segment.meeting_id,
    segment.speaker_id ?? null,
    segment.text,
    segment.start_time,
    segment.end_time,
    segment.confidence,
    segment.sequence_number
  );
  
  return result.lastInsertRowid as number;
}

export function getTranscriptByMeeting(meetingId: number): TranscriptSegment[] {
  const stmt = db.prepare('SELECT * FROM transcript_segments WHERE meeting_id = ? ORDER BY sequence_number');
  return stmt.all(meetingId) as TranscriptSegment[];
}

export function getFullTranscriptText(meetingId: number): string {
  const segments = getTranscriptByMeeting(meetingId);
  return segments.map(s => s.text).join(' ');
}

// ============================================================================
// FACTS OPERATIONS (Enhanced)
// ============================================================================

export async function saveFacts(f: any, meetingId?: number) {
  const now = new Date().toISOString();
  
  // Save actions
  const act = db.prepare(`
    INSERT INTO actions(meeting_id, owner, description, due_date, confidence, status, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const a of f.actions ?? []) {
    act.run(
      meetingId ?? null,
      a.owner,
      a.description,
      a.due_date ?? null,
      a.confidence ?? null,
      a.status ?? 'pending',
      a.priority ?? null,
      now,
      now
    );
  }

  // Save decisions
  const dec = db.prepare(`
    INSERT INTO decisions(meeting_id, summary, rationale, date, impact, stakeholders, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const d of f.decisions ?? []) {
    dec.run(
      meetingId ?? null,
      d.summary,
      d.rationale ?? null,
      d.date ?? null,
      d.impact ?? null,
      d.stakeholders ? JSON.stringify(d.stakeholders) : null,
      now
    );
  }

  // Save risks
  const risk = db.prepare(`
    INSERT INTO risks(meeting_id, summary, severity, owner_if_any, mitigation_plan, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of f.risks ?? []) {
    risk.run(
      meetingId ?? null,
      r.summary,
      r.severity,
      r.owner_if_any ?? null,
      r.mitigation_plan ?? null,
      r.status ?? 'identified',
      now,
      now
    );
  }
}

// ============================================================================
// ANALYTICS & INSIGHTS
// ============================================================================

export function getActionsByOwner(owner: string): Action[] {
  const stmt = db.prepare('SELECT * FROM actions WHERE owner = ? ORDER BY due_date');
  return stmt.all(owner) as Action[];
}

export function getPendingActions(): Action[] {
  const stmt = db.prepare("SELECT * FROM actions WHERE status = 'pending' ORDER BY due_date");
  return stmt.all() as Action[];
}

export function getOverdueActions(): Action[] {
  const today = new Date().toISOString().split('T')[0];
  const stmt = db.prepare("SELECT * FROM actions WHERE status = 'pending' AND due_date < ? ORDER BY due_date");
  return stmt.all(today) as Action[];
}

export function getHighSeverityRisks(): Risk[] {
  const stmt = db.prepare("SELECT * FROM risks WHERE severity IN ('high', 'critical') AND status != 'resolved' ORDER BY severity DESC");
  return stmt.all() as Risk[];
}

export function getMeetingStats(meetingId: number) {
  const actions = db.prepare('SELECT COUNT(*) as count FROM actions WHERE meeting_id = ?').get(meetingId) as { count: number };
  const decisions = db.prepare('SELECT COUNT(*) as count FROM decisions WHERE meeting_id = ?').get(meetingId) as { count: number };
  const risks = db.prepare('SELECT COUNT(*) as count FROM risks WHERE meeting_id = ?').get(meetingId) as { count: number };
  const speakers = db.prepare('SELECT COUNT(*) as count FROM speakers WHERE meeting_id = ?').get(meetingId) as { count: number };
  
  return {
    actions: actions.count,
    decisions: decisions.count,
    risks: risks.count,
    speakers: speakers.count
  };
}

export function getOwnerWorkload(): Array<{ owner: string; pending: number; in_progress: number; total: number }> {
  const stmt = db.prepare(`
    SELECT
      owner,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      COUNT(*) as total
    FROM actions
    WHERE status IN ('pending', 'in_progress')
    GROUP BY owner
    ORDER BY total DESC
  `);
  return stmt.all() as Array<{ owner: string; pending: number; in_progress: number; total: number }>;
}
