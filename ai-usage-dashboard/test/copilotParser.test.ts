// ai-usage-dashboard/test/copilotParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseCopilotFile, extractWorkspaceFromYaml } from '../src/logScanner/copilotParser';

const REAL_SAMPLE_LINE = JSON.stringify({
  type: 'session.usage_checkpoint',
  data: {
    totalNanoAiu: 4002830000,
    totalPremiumRequests: 1,
    lastActiveModel: 'claude-sonnet-5',
    promptCacheBreakState: [
      {
        conversation: 'main',
        models: {
          'claude-sonnet-5': {
            model: 'claude-sonnet-5',
            prompt_tokens: 32354,
            cache_read: 17859,
            cache_write: 14493,
          },
        },
      },
    ],
  },
  id: '4da6ee11-9aeb-408b-a5d9-3f6f8c8460a6',
  timestamp: '2026-09-07T11:52:50.537Z',
});

const WORKSPACE_YAML = [
  'id: 012a299b-844e-4492-b5a2-d47368a45f38',
  'cwd: C:\\Users\\Wilson.Pinto\\DevSetup\\.worktrees\\copilot-vs-claude-benchmark\\Benchmarks\\copilot-vs-claude',
  'git_root: C:\\Users\\Wilson.Pinto\\DevSetup\\.worktrees\\copilot-vs-claude-benchmark',
  'repository: wilsonpinto88/DevSetup',
].join('\n');

describe('extractWorkspaceFromYaml', () => {
  it('prefers git_root over cwd', () => {
    expect(extractWorkspaceFromYaml(WORKSPACE_YAML)).toBe(
      'C:\\Users\\Wilson.Pinto\\DevSetup\\.worktrees\\copilot-vs-claude-benchmark'
    );
  });

  it('falls back to cwd when git_root is absent', () => {
    const yaml = 'cwd: C:\\DEV\\Fabasoft_WS\n';
    expect(extractWorkspaceFromYaml(yaml)).toBe('C:\\DEV\\Fabasoft_WS');
  });

  it('returns empty string when neither key is present', () => {
    expect(extractWorkspaceFromYaml('id: abc\n')).toBe('');
  });
});

describe('parseCopilotFile', () => {
  it('parses a real-shaped usage_checkpoint line into a UsageEvent', () => {
    const events = parseCopilotFile(REAL_SAMPLE_LINE, 'session-xyz', 'C:\\DEV\\Fabasoft_WS');
    expect(events).toEqual([
      {
        source: 'copilot',
        sessionId: 'session-xyz',
        timestamp: '2026-09-07T11:52:50.537Z',
        model: 'claude-sonnet-5',
        workspace: 'Fabasoft_WS',
        inputTokens: 32354,
        outputTokens: 0,
        cacheReadTokens: 17859,
        cacheWriteTokens: 14493,
        nanoAiu: 4002830000,
        premiumRequests: 1,
      },
    ]);
  });

  it('skips events that are not usage_checkpoint', () => {
    const line = JSON.stringify({ type: 'session.other_event', data: {} });
    expect(parseCopilotFile(line, 's1', 'ws')).toEqual([]);
  });

  it('skips malformed JSON lines without throwing', () => {
    expect(() => parseCopilotFile('{not json', 's1', 'ws')).not.toThrow();
  });
});
