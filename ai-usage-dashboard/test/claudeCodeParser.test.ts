// ai-usage-dashboard/test/claudeCodeParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseClaudeCodeFile } from '../src/logScanner/claudeCodeParser';

const REAL_SAMPLE_LINE = JSON.stringify({
  parentUuid: '018c3e48-2b1f-42e3-b014-f5af8e8251e6',
  isSidechain: false,
  message: {
    model: 'claude-sonnet-5',
    id: 'msg_011CeufheGFRm39ToRTroiSz',
    type: 'message',
    role: 'assistant',
    usage: {
      input_tokens: 2,
      cache_creation_input_tokens: 20990,
      cache_read_input_tokens: 36341,
      output_tokens: 151,
    },
  },
  timestamp: '2026-09-10T11:19:24.197Z',
  cwd: 'c:\\DEV\\Fabasoft_WS',
});

describe('parseClaudeCodeFile', () => {
  it('parses a real-shaped usage line into a UsageEvent', () => {
    const events = parseClaudeCodeFile(REAL_SAMPLE_LINE, 'session-abc');
    expect(events).toEqual([
      {
        source: 'claude-code',
        sessionId: 'session-abc',
        timestamp: '2026-09-10T11:19:24.197Z',
        model: 'claude-sonnet-5',
        workspace: 'Fabasoft_WS',
        inputTokens: 2,
        outputTokens: 151,
        cacheReadTokens: 36341,
        cacheWriteTokens: 20990,
      },
    ]);
  });

  it('skips lines without message.usage', () => {
    const line = JSON.stringify({ parentUuid: null, message: { type: 'message' } });
    expect(parseClaudeCodeFile(line, 's1')).toEqual([]);
  });

  it('skips malformed JSON lines without throwing', () => {
    expect(() => parseClaudeCodeFile('{not json', 's1')).not.toThrow();
    expect(parseClaudeCodeFile('{not json', 's1')).toEqual([]);
  });

  it('skips blank lines', () => {
    expect(parseClaudeCodeFile('\n\n   \n', 's1')).toEqual([]);
  });

  it('parses multiple lines from one file', () => {
    const content = [REAL_SAMPLE_LINE, REAL_SAMPLE_LINE].join('\n');
    expect(parseClaudeCodeFile(content, 's1')).toHaveLength(2);
  });

  it('extracts the skill name from a Skill tool_use block on the same turn', () => {
    const line = JSON.stringify({
      parentUuid: '05e36474-f095-4f40-bca5-e3bccab07144',
      isSidechain: false,
      message: {
        model: 'claude-sonnet-5',
        id: 'msg_011Cf7J2xXr56KLjiw6rqUwr',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'Skill', input: { skill: 'caveman' } }],
        usage: { input_tokens: 2, cache_creation_input_tokens: 15670, cache_read_input_tokens: 3692, output_tokens: 60 },
      },
      timestamp: '2026-09-16T10:00:00.000Z',
      cwd: 'c:\\DEV\\Fabasoft_WS',
    });
    const [event] = parseClaudeCodeFile(line, 's1');
    expect(event.skillsUsed).toEqual(['caveman']);
  });

  it('omits skillsUsed when the turn has no Skill tool_use block', () => {
    const [event] = parseClaudeCodeFile(REAL_SAMPLE_LINE, 's1');
    expect(event.skillsUsed).toBeUndefined();
  });

  it('ignores non-Skill tool_use blocks', () => {
    const line = JSON.stringify({
      message: {
        model: 'claude-sonnet-5',
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'Read', input: { file_path: 'x' } }],
        usage: { input_tokens: 1, output_tokens: 1 },
      },
      timestamp: '2026-09-16T10:00:00.000Z',
      cwd: 'c:\\DEV\\Fabasoft_WS',
    });
    const [event] = parseClaudeCodeFile(line, 's1');
    expect(event.skillsUsed).toBeUndefined();
  });
});
