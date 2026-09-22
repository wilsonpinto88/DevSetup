// ai-usage-dashboard/test/copilotDb.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readCopilotEvents } from '../src/logScanner/copilotDb';

// Vite's static import graph mishandles the "node:" prefix for this builtin
// (drops it, then fails to resolve the bare "sqlite" package) — going
// through require() sidesteps Vite's module resolution entirely.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

let tmpRoot: string;
let dbPath: string;

function makeDb(): any {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE sessions (id TEXT PRIMARY KEY, cwd TEXT);
    CREATE TABLE assistant_usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      model TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      cache_read_tokens INTEGER,
      cache_write_tokens INTEGER,
      total_nano_aiu INTEGER,
      request_multiplier REAL,
      created_at TEXT
    );
  `);
  return db;
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-db-test-'));
  dbPath = path.join(tmpRoot, 'session-store.db');
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('readCopilotEvents', () => {
  it('returns empty events without error when the db file does not exist', () => {
    const result = readCopilotEvents(path.join(tmpRoot, 'missing.db'), { lastId: 0 });
    expect(result.events).toEqual([]);
    expect(result.cursor).toEqual({ lastId: 0 });
    expect(result.error).toBeUndefined();
  });

  it('maps assistant_usage_events rows joined with sessions.cwd into UsageEvents', () => {
    const db = makeDb();
    db.prepare('INSERT INTO sessions (id, cwd) VALUES (?, ?)').run('s1', 'C:\\DEV\\Fabasoft_WS');
    db.prepare(
      `INSERT INTO assistant_usage_events
        (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)
       VALUES ('s1', 'claude-sonnet-5', 10, 20, 5, 3, 741150000, 1, '2026-09-07T11:52:50.537Z')`
    ).run();
    db.close();

    const result = readCopilotEvents(dbPath, { lastId: 0 });
    expect(result.events).toEqual([
      {
        source: 'copilot',
        sessionId: 's1',
        timestamp: '2026-09-07T11:52:50.537Z',
        model: 'claude-sonnet-5',
        workspace: 'Fabasoft_WS',
        inputTokens: 10,
        outputTokens: 20,
        cacheReadTokens: 5,
        cacheWriteTokens: 3,
        nanoAiu: 741150000,
        premiumRequests: 1,
      },
    ]);
    expect(result.cursor).toEqual({ lastId: 1 });
  });

  it('only returns rows with id greater than the cursor', () => {
    const db = makeDb();
    db.prepare('INSERT INTO sessions (id, cwd) VALUES (?, ?)').run('s1', 'C:\\DEV\\ws1');
    for (let i = 0; i < 3; i++) {
      db.prepare(
        `INSERT INTO assistant_usage_events
          (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)
         VALUES ('s1', 'claude-sonnet-5', ?, 0, 0, 0, 0, 0, '2026-09-07T00:00:00.000Z')`
      ).run(i);
    }
    db.close();

    const result = readCopilotEvents(dbPath, { lastId: 2 });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].inputTokens).toBe(2);
    expect(result.cursor).toEqual({ lastId: 3 });
  });

  it('dedupes exact-duplicate retry rows (same session/timestamp/model/tokens, different id)', () => {
    const db = makeDb();
    db.prepare('INSERT INTO sessions (id, cwd) VALUES (?, ?)').run('s1', 'C:\\DEV\\ws1');
    const insert = db.prepare(
      `INSERT INTO assistant_usage_events
        (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)
       VALUES ('s1', 'claude-sonnet-5', 10, 20, 0, 0, 1000, 1, '2026-09-07T11:52:50.537Z')`
    );
    insert.run();
    insert.run(); // exact-duplicate retry
    db.close();

    const result = readCopilotEvents(dbPath, { lastId: 0 });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].nanoAiu).toBe(1000);
    // Cursor still advances past the duplicate row's id so it's not re-scanned.
    expect(result.cursor).toEqual({ lastId: 2 });
  });

  it('does not dedupe distinct calls that happen to share model/tokens', () => {
    const db = makeDb();
    db.prepare('INSERT INTO sessions (id, cwd) VALUES (?, ?)').run('s1', 'C:\\DEV\\ws1');
    const insert = db.prepare(
      `INSERT INTO assistant_usage_events
        (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)
       VALUES ('s1', 'claude-sonnet-5', 10, 20, 0, 0, 1000, 1, ?)`
    );
    insert.run('2026-09-07T11:52:50.537Z');
    insert.run('2026-09-07T11:53:12.000Z'); // different timestamp -> real distinct call
    db.close();

    const result = readCopilotEvents(dbPath, { lastId: 0 });
    expect(result.events).toHaveLength(2);
  });

  it('keeps nanoAiu even when request_multiplier is 0 — verified against GitHub\'s real Credits panel: excluding these rows undercounted by ~123 credits/month, matching the sum of exactly these rows', () => {
    const db = makeDb();
    db.prepare('INSERT INTO sessions (id, cwd) VALUES (?, ?)').run('s1', 'C:\\DEV\\ws1');
    db.prepare(
      `INSERT INTO assistant_usage_events
        (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)
       VALUES ('s1', 'gpt-5.4-mini', 10, 20, 0, 0, 500, 0, '2026-09-07T11:52:50.537Z')`
    ).run();
    db.close();

    const result = readCopilotEvents(dbPath, { lastId: 0 });
    expect(result.events[0].nanoAiu).toBe(500);
    expect(result.events[0].premiumRequests).toBe(0);
    expect(result.events[0].inputTokens).toBe(10);
    expect(result.events[0].outputTokens).toBe(20);
  });

  it('keeps nanoAiu when request_multiplier is null, but reports premiumRequests as 0', () => {
    const db = makeDb();
    db.prepare('INSERT INTO sessions (id, cwd) VALUES (?, ?)').run('s1', 'C:\\DEV\\ws1');
    db.prepare(
      `INSERT INTO assistant_usage_events
        (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)
       VALUES ('s1', 'gpt-5.4-mini', 10, 20, 0, 0, 500, NULL, '2026-09-07T11:52:50.537Z')`
    ).run();
    db.close();

    const result = readCopilotEvents(dbPath, { lastId: 0 });
    expect(result.events[0].nanoAiu).toBe(500);
    expect(result.events[0].premiumRequests).toBe(0);
  });

  it('tags events with skillsUsed from <skill-context> turns that occurred before them in the same session', () => {
    const db = makeDb();
    db.exec(`
      CREATE TABLE turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        turn_index INTEGER,
        user_message TEXT,
        assistant_response TEXT,
        timestamp TEXT
      );
    `);
    db.prepare('INSERT INTO sessions (id, cwd) VALUES (?, ?)').run('s1', 'C:\\DEV\\ws1');
    db.prepare(
      'INSERT INTO turns (session_id, turn_index, user_message, timestamp) VALUES (?, ?, ?, ?)'
    ).run('s1', 0, 'have a bug', '2026-09-07T11:52:00.000Z');
    db.prepare(
      'INSERT INTO turns (session_id, turn_index, user_message, timestamp) VALUES (?, ?, ?, ?)'
    ).run('s1', 1, '<skill-context name="caveman">\nBody...\n</skill-context>', '2026-09-07T11:52:10.000Z');
    db.prepare(
      'INSERT INTO turns (session_id, turn_index, user_message, timestamp) VALUES (?, ?, ?, ?)'
    ).run('s1', 2, 'thanks', '2026-09-07T11:53:00.000Z');
    const insert = db.prepare(
      `INSERT INTO assistant_usage_events
        (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)
       VALUES ('s1', 'claude-sonnet-5', ?, ?, 0, 0, 1000, 1, ?)`
    );
    insert.run(5, 5, '2026-09-07T11:52:05.000Z'); // before the skill turn -> no tag
    insert.run(10, 20, '2026-09-07T11:52:15.000Z'); // inside the skill's turn window -> tagged
    db.close();

    const result = readCopilotEvents(dbPath, { lastId: 0 });
    const before = result.events.find((e) => e.timestamp === '2026-09-07T11:52:05.000Z');
    const during = result.events.find((e) => e.timestamp === '2026-09-07T11:52:15.000Z');
    expect(before?.skillsUsed).toBeUndefined();
    expect(during?.skillsUsed).toEqual(['caveman']);
  });

  it('omits skillsUsed entirely when the db has no turns table (older schema)', () => {
    const db = makeDb();
    db.prepare('INSERT INTO sessions (id, cwd) VALUES (?, ?)').run('s1', 'C:\\DEV\\ws1');
    db.prepare(
      `INSERT INTO assistant_usage_events
        (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)
       VALUES ('s1', 'claude-sonnet-5', 5, 5, 0, 0, 1000, 1, '2026-09-07T11:52:05.000Z')`
    ).run();
    db.close();

    const result = readCopilotEvents(dbPath, { lastId: 0 });
    expect(result.events[0].skillsUsed).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('falls back to unknown model and empty workspace when session/model data is missing', () => {
    const db = makeDb();
    db.prepare(
      `INSERT INTO assistant_usage_events
        (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)
       VALUES ('orphan-session', NULL, 1, 1, 0, 0, 0, 0, '2026-09-07T00:00:00.000Z')`
    ).run();
    db.close();

    const result = readCopilotEvents(dbPath, { lastId: 0 });
    expect(result.events[0].model).toBe('unknown');
    expect(result.events[0].workspace).toBe('unknown');
  });
});
