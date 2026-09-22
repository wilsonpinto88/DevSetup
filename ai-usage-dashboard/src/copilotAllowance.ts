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
  // Real premium-request count from local logs (totals.totalPremiumRequests),
  // used as the "used" numerator when there's no auto-fetched value — GitHub
  // has no public API for a personal account's real billed usage, so this is
  // the closest local approximation to what the manual allowance is tracking.
  manualUsed?: number;
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
    return { used: deps.manualUsed ?? 0, total: deps.manualAllowance, source: 'manual' };
  }
  return undefined;
}
