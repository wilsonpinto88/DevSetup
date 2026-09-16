import { describe, it, expect } from 'vitest';
import { normalizeWorkspace } from '../src/logScanner/workspaceNormalize';

describe('normalizeWorkspace', () => {
  it('extracts basename from a Windows path', () => {
    expect(normalizeWorkspace('c:\\DEV\\Fabasoft_WS')).toBe('Fabasoft_WS');
  });

  it('extracts basename from a nested worktree path', () => {
    expect(
      normalizeWorkspace(
        'C:\\Users\\Wilson.Pinto\\DevSetup\\.worktrees\\copilot-vs-claude-benchmark'
      )
    ).toBe('copilot-vs-claude-benchmark');
  });

  it('strips a trailing slash', () => {
    expect(normalizeWorkspace('c:\\DEV\\Fabasoft_WS\\')).toBe('Fabasoft_WS');
  });

  it('returns "unknown" for empty input', () => {
    expect(normalizeWorkspace('')).toBe('unknown');
  });
});
