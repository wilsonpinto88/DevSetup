// ai-usage-dashboard/test/logRepository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanAll } from '../src/logScanner/logRepository';

let tmpRoot: string;
let claudeRoot: string;
let copilotRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-usage-test-'));
  claudeRoot = path.join(tmpRoot, 'claude-projects');
  copilotRoot = path.join(tmpRoot, 'copilot-sessions');
  fs.mkdirSync(claudeRoot, { recursive: true });
  fs.mkdirSync(copilotRoot, { recursive: true });
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

    const result = scanAll(claudeRoot, copilotRoot, {});
    expect(result.events).toHaveLength(1);
    expect(result.events[0].source).toBe('claude-code');
    expect(result.events[0].sessionId).toBe('session1');
    expect(result.events[0].workspace).toBe('Fabasoft_WS');
  });

  it('finds and parses Copilot session dirs with workspace.yaml + events.jsonl', () => {
    const sessionDir = path.join(copilotRoot, '012a299b-844e-4492-b5a2-d47368a45f38');
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(
      path.join(sessionDir, 'workspace.yaml'),
      'git_root: C:\\DEV\\Fabasoft_WS\ncwd: C:\\DEV\\Fabasoft_WS\n'
    );
    const line = JSON.stringify({
      type: 'session.usage_checkpoint',
      data: { totalNanoAiu: 100, totalPremiumRequests: 1, lastActiveModel: 'claude-sonnet-5' },
      timestamp: '2026-09-07T00:00:00.000Z',
    });
    fs.writeFileSync(path.join(sessionDir, 'events.jsonl'), line + '\n');

    const result = scanAll(claudeRoot, copilotRoot, {});
    expect(result.events).toHaveLength(1);
    expect(result.events[0].source).toBe('copilot');
    expect(result.events[0].sessionId).toBe('012a299b-844e-4492-b5a2-d47368a45f38');
    expect(result.events[0].workspace).toBe('Fabasoft_WS');
  });

  it('returns empty events and does not throw when both roots are missing', () => {
    const result = scanAll(
      path.join(tmpRoot, 'does-not-exist-1'),
      path.join(tmpRoot, 'does-not-exist-2'),
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

    const first = scanAll(claudeRoot, copilotRoot, {});
    expect(first.events).toHaveLength(1);

    fs.appendFileSync(filePath, line(2) + '\n');
    const second = scanAll(claudeRoot, copilotRoot, first.cache);
    expect(second.events).toHaveLength(1);
    expect(second.events[0].inputTokens).toBe(2);
  });
});
