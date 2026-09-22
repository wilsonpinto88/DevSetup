// ai-usage-dashboard/src/logScanner/copilotDb.ts
import * as fs from 'fs';
import { UsageEvent } from './types';
import { normalizeWorkspace } from './workspaceNormalize';

export interface CopilotDbCursor {
  lastId: number;
}

export interface CopilotDbResult {
  events: UsageEvent[];
  cursor: CopilotDbCursor;
  error?: string;
}

interface TurnRow {
  session_id: string;
  timestamp: string;
  user_message: string | null;
}

interface SkillWindow {
  startMs: number;
  skills: string[];
}

const SKILL_CONTEXT_RE = /<skill-context name="([^"]+)">/g;

// The Copilot CLI has no dedicated "skill invocation" column/table — but when
// a skill is loaded, its content gets injected as a synthetic user turn
// (`<skill-context name="...">...`) right before the assistant turn that
// actually uses it. That's the same signal this CLI's own transcript uses,
// so it's parsed the same way here: per session, build ordered windows keyed
// by turn timestamp, then tag each usage-event row with whichever window's
// skills are in effect at that row's created_at.
function loadSkillWindows(db: any): Map<string, SkillWindow[]> {
  let rows: TurnRow[];
  try {
    rows = db.prepare(`SELECT session_id, timestamp, user_message FROM turns ORDER BY session_id, turn_index`).all() as TurnRow[];
  } catch {
    // Older schemas / DBs without a turns table simply get no skill tagging.
    return new Map();
  }
  const bySession = new Map<string, SkillWindow[]>();
  for (const row of rows) {
    const skills: string[] = [];
    if (row.user_message) {
      SKILL_CONTEXT_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = SKILL_CONTEXT_RE.exec(row.user_message))) {
        skills.push(m[1]);
      }
    }
    const list = bySession.get(row.session_id) ?? [];
    list.push({ startMs: new Date(row.timestamp).getTime(), skills });
    bySession.set(row.session_id, list);
  }
  return bySession;
}

function skillsAt(windows: SkillWindow[] | undefined, ts: number): string[] | undefined {
  if (!windows) {
    return undefined;
  }
  let match: string[] | undefined;
  for (const w of windows) {
    if (w.startMs > ts) {
      break;
    }
    match = w.skills;
  }
  return match && match.length > 0 ? match : undefined;
}

interface AssistantUsageRow {
  id: number;
  session_id: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_write_tokens: number | null;
  total_nano_aiu: number | null;
  request_multiplier: number | null;
  created_at: string;
  workspace: string | null;
}

// ~/.copilot/session-store.db's assistant_usage_events table is one row per
// real model call (id is a monotonic autoincrement), unlike events.jsonl's
// session.usage_checkpoint records, which are periodic/cumulative snapshots
// that double- and triple-count the same usage when summed. This table also
// carries real output_tokens, which events.jsonl never reports at all.
export function readCopilotEvents(dbPath: string, cursor: CopilotDbCursor): CopilotDbResult {
  if (!fs.existsSync(dbPath)) {
    return { events: [], cursor };
  }

  let DatabaseSync: any;
  try {
    // node:sqlite is a stable built-in on modern Node, but the extension
    // host's bundled Node version isn't guaranteed — degrade gracefully
    // instead of crashing the whole scan if it's ever unavailable.
    ({ DatabaseSync } = require('node:sqlite'));
  } catch (e) {
    return { events: [], cursor, error: `node:sqlite unavailable: ${(e as Error).message}` };
  }

  let db: any;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db
      .prepare(
        `SELECT e.id, e.session_id, e.model, e.input_tokens, e.output_tokens,
                e.cache_read_tokens, e.cache_write_tokens, e.total_nano_aiu,
                e.request_multiplier, e.created_at, s.cwd as workspace
         FROM assistant_usage_events e
         LEFT JOIN sessions s ON s.id = e.session_id
         WHERE e.id > ?
         ORDER BY e.id`
      )
      .all(cursor.lastId) as AssistantUsageRow[];

    const skillWindows = loadSkillWindows(db);

    // The Copilot CLI's telemetry writer sometimes logs the same call twice
    // with an identical payload (a retry/replay) — same session, timestamp,
    // model, and token counts, only `id` differs. Left undeduped, these
    // double-count nanoAiu/tokens. `id` still advances the cursor past every
    // row seen (including the duplicate) so it isn't re-read next scan.
    let maxId = cursor.lastId;
    const seenKeys = new Set<string>();
    const events: UsageEvent[] = [];
    for (const row of rows) {
      maxId = Math.max(maxId, row.id);
      const dedupeKey = `${row.session_id}|${row.created_at}|${row.model}|${row.input_tokens}|${row.output_tokens}|${row.total_nano_aiu}`;
      if (seenKeys.has(dedupeKey)) {
        continue;
      }
      seenKeys.add(dedupeKey);

      // request_multiplier of 0 (or null) means GitHub doesn't bill this call
      // as a premium request, but total_nano_aiu is still logged for it —
      // counting that nanoAiu would overstate real AI-unit consumption.
      const multiplier = row.request_multiplier;
      const isBilled = multiplier !== null && multiplier !== 0;
      const skillsUsed = skillsAt(skillWindows.get(row.session_id), new Date(row.created_at).getTime());

      events.push({
        source: 'copilot',
        sessionId: row.session_id,
        timestamp: row.created_at,
        model: row.model ?? 'unknown',
        workspace: normalizeWorkspace(row.workspace ?? ''),
        inputTokens: row.input_tokens ?? 0,
        outputTokens: row.output_tokens ?? 0,
        cacheReadTokens: row.cache_read_tokens ?? 0,
        cacheWriteTokens: row.cache_write_tokens ?? 0,
        nanoAiu: isBilled ? row.total_nano_aiu ?? 0 : 0,
        premiumRequests: multiplier ?? 0,
        ...(skillsUsed ? { skillsUsed } : {}),
      });
    }

    return { events, cursor: { lastId: maxId } };
  } catch (e) {
    // Most commonly a locked/busy file (Copilot CLI has it open) — treat as
    // "no new data this scan" rather than failing the whole refresh.
    return { events: [], cursor, error: (e as Error).message };
  } finally {
    db?.close?.();
  }
}
