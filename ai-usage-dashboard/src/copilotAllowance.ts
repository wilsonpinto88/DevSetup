// ai-usage-dashboard/src/copilotAllowance.ts
export interface AllowanceResult {
  used: number;
  total: number;
  source: 'auto' | 'manual';
}

export interface AllowanceFetchDeps {
  getGithubToken: () => Promise<string | undefined>;
  fetchAllowance: (token: string) => Promise<{ used: number; total: number } | undefined>;
  manualAllowance: number | undefined;
}

export async function resolveAllowance(deps: AllowanceFetchDeps): Promise<AllowanceResult | undefined> {
  const token = await deps.getGithubToken();
  if (token) {
    try {
      const result = await deps.fetchAllowance(token);
      if (result) {
        return { used: result.used, total: result.total, source: 'auto' };
      }
    } catch {
      // fall through to manual
    }
  }
  if (deps.manualAllowance !== undefined) {
    return { used: 0, total: deps.manualAllowance, source: 'manual' };
  }
  return undefined;
}
