// ai-usage-dashboard/test/logRepository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanAll } from '../src/logScanner/logRepository';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

let tmpRoot: string;
let claudeRoot: string;
let copilotDbPath: string;

function makeCopilotDb(dbPath: string) {
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
      reasoning_tokens INTEGER,
      total_nano_aiu INTEGER,
      request_multiplier REAL,
      created_at TEXT
    );
  `);
  db.close();
  return db;
}

function insertUsageRow(
  dbPath: string,
  row: { sessionId: string; cwd: string; model: string; inputTokens: number; outputTokens: number; createdAt: string }
) {
  const db = new DatabaseSync(dbPath);
  db.prepare('INSERT OR IGNORE INTO sessions (id, cwd) VALUES (?, ?)').run(row.sessionId, row.cwd);
  db.prepare(
    `INSERT INTO assistant_usage_events
      (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)
     VALUES (?, ?, ?, ?, 0, 0, 100, 1, ?)`
  ).run(row.sessionId, row.model, row.inputTokens, row.outputTokens, row.createdAt);
  db.close();
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-usage-test-'));
  claudeRoot = path.join(tmpRoot, 'claude-projects');
  copilotDbPath = path.join(tmpRoot, 'session-store.db');
  fs.mkdirSync(claudeRoot, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('scanAll', () => {
  it('finds and parses Claude Code jsonl files under nested project dirs', () => {
    const projectDir = path.join(claudeRoot, 'c--DEV-Fabasoft-WS');
    fs.mkdirSync(projectDir, { recursive: true });
    const line = JSON.stringify({
      message: { model: 'claude-sonnet-5', usage: { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
      timestamp: '2026-09-10T00:00:00.000Z',
      cwd: 'c:\\DEV\\Fabasoft_WS',
    });
    fs.writeFileSync(path.join(projectDir, 'session1.jsonl'), line + '\n');

    const result = scanAll(claudeRoot, copilotDbPath, {});
    expect(result.events).toHaveLength(1);
    expect(result.events[0].source).toBe('claude-code');
    expect(result.events[0].sessionId).toBe('session1');
    expect(result.events[0].workspace).toBe('Fabasoft_WS');
  });

  it('reads Copilot usage from assistant_usage_events, joined to sessions.cwd', () => {
    makeCopilotDb(copilotDbPath);
    insertUsageRow(copilotDbPath, {
      sessionId: 's1',
      cwd: 'C:\\DEV\\Fabasoft_WS',
      model: 'claude-sonnet-5',
      inputTokens: 5,
      outputTokens: 3,
      createdAt: '2026-09-07T00:00:00.000Z',
    });

    const result = scanAll(claudeRoot, copilotDbPath, {});
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      source: 'copilot',
      sessionId: 's1',
      workspace: 'Fabasoft_WS',
      inputTokens: 5,
      outputTokens: 3,
    });
  });

  it('returns empty events and does not throw when both roots are missing', () => {
    const result = scanAll(
      path.join(tmpRoot, 'does-not-exist-1'),
      path.join(tmpRoot, 'does-not-exist-2.db'),
      {}
    );
    expect(result.events).toEqual([]);
  });

  it('only reads newly appended bytes on a second scan using the returned cache', () => {
    const projectDir = path.join(claudeRoot, 'ws1');
    fs.mkdirSync(projectDir, { recursive: true });
    const filePath = path.join(projectDir, 'session1.jsonl');
    const line = (n: number) =>
      JSON.stringify({
        message: { model: 'claude-sonnet-5', usage: { input_tokens: n, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
        timestamp: '2026-09-10T00:00:00.000Z',
        cwd: 'c:\\DEV\\ws1',
      });
    fs.writeFileSync(filePath, line(1) + '\n');

    const first = scanAll(claudeRoot, copilotDbPath, {});
    expect(first.events).toHaveLength(1);

    fs.appendFileSync(filePath, line(2) + '\n');
    const second = scanAll(claudeRoot, copilotDbPath, first.cache);
    expect(second.events).toHaveLength(1);
    expect(second.events[0].inputTokens).toBe(2);
  });

  it('only returns Copilot rows newer than the given cursor on a second scan', () => {
    makeCopilotDb(copilotDbPath);
    insertUsageRow(copilotDbPath, {
      sessionId: 's1',
      cwd: 'C:\\DEV\\ws1',
      model: 'claude-sonnet-5',
      inputTokens: 1,
      outputTokens: 1,
      createdAt: '2026-09-07T00:00:00.000Z',
    });

    const first = scanAll(claudeRoot, copilotDbPath, {});
    expect(first.events).toHaveLength(1);
    expect(first.copilotCursor.lastId).toBe(1);

    insertUsageRow(copilotDbPath, {
      sessionId: 's1',
      cwd: 'C:\\DEV\\ws1',
      model: 'claude-sonnet-5',
      inputTokens: 2,
      outputTokens: 2,
      createdAt: '2026-09-07T01:00:00.000Z',
    });

    const second = scanAll(claudeRoot, copilotDbPath, first.cache, first.copilotCursor);
    expect(second.events).toHaveLength(1);
    expect(second.events[0].inputTokens).toBe(2);
  });
});
