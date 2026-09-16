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
});
