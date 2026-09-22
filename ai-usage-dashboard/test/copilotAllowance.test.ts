// ai-usage-dashboard/test/copilotAllowance.test.ts
import { describe, it, expect, vi } from 'vitest';
import { resolveAllowance } from '../src/copilotAllowance';

describe('resolveAllowance', () => {
  it('returns auto-fetched allowance when the endpoint succeeds', async () => {
    const result = await resolveAllowance({
      getGithubToken: async () => 'tok',
      fetchAllowance: async () => ({ used: 3633.2, total: 30000 }),
      manualAllowance: undefined,
    });
    expect(result).toEqual({ used: 3633.2, total: 30000, source: 'auto' });
  });

  it('falls back to manual allowance when the fetch throws', async () => {
    const result = await resolveAllowance({
      getGithubToken: async () => 'tok',
      fetchAllowance: async () => {
        throw new Error('404');
      },
      manualAllowance: 30000,
    });
    expect(result).toEqual({ used: 0, total: 30000, source: 'manual' });
  });

  it('uses the real local premium-request count as "used" in manual mode, when provided', async () => {
    const result = await resolveAllowance({
      getGithubToken: async () => undefined,
      fetchAllowance: vi.fn(),
      manualAllowance: 30000,
      manualUsed: 412,
    });
    expect(result).toEqual({ used: 412, total: 30000, source: 'manual' });
  });

  it('returns undefined when auto fails and no manual value is set', async () => {
    const result = await resolveAllowance({
      getGithubToken: async () => 'tok',
      fetchAllowance: async () => undefined,
      manualAllowance: undefined,
    });
    expect(result).toBeUndefined();
  });

  it('falls back to manual when no GitHub token is available', async () => {
    const result = await resolveAllowance({
      getGithubToken: async () => undefined,
      fetchAllowance: vi.fn(),
      manualAllowance: 25000,
    });
    expect(result).toEqual({ used: 0, total: 25000, source: 'manual' });
  });
});
