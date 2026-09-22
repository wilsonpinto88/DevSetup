import { UsageEvent } from './logScanner/types';
import { computeCost } from './pricing';

export interface Totals {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  totalNanoAiu: number;
  totalPremiumRequests: number;
  sessionCount: number;
  eventCount: number;
}

export function computeTotals(events: UsageEvent[]): Totals {
  const sessionIds = new Set<string>();
  const totals: Totals = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    totalNanoAiu: 0,
    totalPremiumRequests: 0,
    sessionCount: 0,
    eventCount: 0,
  };
  for (const e of events) {
    sessionIds.add(`${e.source}:${e.sessionId}`);
    totals.totalInputTokens += e.inputTokens;
    totals.totalOutputTokens += e.outputTokens;
    totals.totalCacheReadTokens += e.cacheReadTokens;
    totals.totalCacheWriteTokens += e.cacheWriteTokens;
    totals.totalNanoAiu += e.nanoAiu ?? 0;
    totals.totalPremiumRequests += e.premiumRequests ?? 0;
    totals.eventCount += 1;
  }
  totals.sessionCount = sessionIds.size;
  return totals;
}

export interface GroupedTotal {
  key: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  nanoAiu: number;
  eventCount: number;
}

function groupBy(events: UsageEvent[], keyFn: (e: UsageEvent) => string): GroupedTotal[] {
  const map = new Map<string, GroupedTotal>();
  for (const e of events) {
    const key = keyFn(e);
    const existing =
      map.get(key) ??
      ({ key, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, nanoAiu: 0, eventCount: 0 } as GroupedTotal);
    existing.inputTokens += e.inputTokens;
    existing.outputTokens += e.outputTokens;
    existing.cacheReadTokens += e.cacheReadTokens;
    existing.cacheWriteTokens += e.cacheWriteTokens;
    existing.nanoAiu += e.nanoAiu ?? 0;
    existing.eventCount += 1;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens)
  );
}

export function groupByModel(events: UsageEvent[]): GroupedTotal[] {
  return groupBy(events, (e) => e.model);
}

export function groupByWorkspace(events: UsageEvent[]): GroupedTotal[] {
  return groupBy(events, (e) => e.workspace);
}

export type TimeRange = 'week' | 'month' | '6months';

export interface DailyPoint {
  bucket: string; // ISO date (day start, UTC)
  inputTokens: number;
  outputTokens: number;
  sessionCount: number;
}

function dayISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekStartISO(d: Date): string {
  const copy = new Date(d);
  const day = copy.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  copy.setUTCDate(copy.getUTCDate() - diff);
  return dayISO(copy);
}

// 'week' and 'month' mean present week-to-date / month-to-date (calendar
// boundaries, matching how billing cycles and the Copilot CLI's own /usage
// report usage), not a rolling N-day window — a rolling window double-counts
// days from a prior cycle and never matches what the CLI shows for "this
// month". '6months' has no calendar-cycle equivalent, so it stays rolling.
function rangeCutoff(range: TimeRange, now: Date): Date {
  if (range === 'week') {
    return new Date(`${weekStartISO(now)}T00:00:00.000Z`);
  }
  if (range === 'month') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
}

export function filterEventsByRange(
  events: UsageEvent[],
  range: TimeRange,
  now: Date = new Date()
): UsageEvent[] {
  const cutoff = rangeCutoff(range, now);
  return events.filter((e) => {
    const ts = new Date(e.timestamp);
    return ts >= cutoff && ts <= now;
  });
}

// Buckets with no events must still appear (as zero points), or a range
// with activity on only one day renders as a single-point chart instead of
// spanning the full selected period (e.g. "This Week" with only Wednesday's
// data would otherwise show just one dot instead of Mon-Sun).
function bucketKeysInRange(cutoff: Date, now: Date, bucketByWeek: boolean): string[] {
  const stepMs = (bucketByWeek ? 7 : 1) * 24 * 60 * 60 * 1000;
  const startKey = bucketByWeek ? weekStartISO(cutoff) : dayISO(cutoff);
  const endKey = bucketByWeek ? weekStartISO(now) : dayISO(now);
  const keys: string[] = [];
  let cursor = new Date(`${startKey}T00:00:00.000Z`);
  const end = new Date(`${endKey}T00:00:00.000Z`);
  while (cursor <= end) {
    keys.push(dayISO(cursor));
    cursor = new Date(cursor.getTime() + stepMs);
  }
  return keys;
}

export function computeDailySeries(
  events: UsageEvent[],
  range: TimeRange,
  now: Date = new Date()
): DailyPoint[] {
  const bucketByWeek = range === '6months';
  const bucketed = new Map<string, { inputTokens: number; outputTokens: number; sessionIds: Set<string> }>();

  for (const e of filterEventsByRange(events, range, now)) {
    const ts = new Date(e.timestamp);
    const bucketKey = bucketByWeek ? weekStartISO(ts) : dayISO(ts);
    const entry = bucketed.get(bucketKey) ?? { inputTokens: 0, outputTokens: 0, sessionIds: new Set<string>() };
    entry.inputTokens += e.inputTokens;
    entry.outputTokens += e.outputTokens;
    entry.sessionIds.add(`${e.source}:${e.sessionId}`);
    bucketed.set(bucketKey, entry);
  }

  const cutoff = rangeCutoff(range, now);
  return bucketKeysInRange(cutoff, now, bucketByWeek).map((bucket) => {
    const v = bucketed.get(bucket);
    return {
      bucket,
      inputTokens: v?.inputTokens ?? 0,
      outputTokens: v?.outputTokens ?? 0,
      sessionCount: v?.sessionIds.size ?? 0,
    };
  });
}

export interface SkillUsage {
  skill: string;
  invocations: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | undefined; // undefined only when no invoking turn has a known pricing rate
  pctOfTotalCost: number | undefined;
  avgTurnTokens: number; // avg (input+output+cacheRead+cacheWrite) across this skill's invoking turns
  // Rough proxy only, not a measured saving: % difference between avgTurnTokens
  // and the average turn size on Claude Code turns that invoked no skill at
  // all. There is no counterfactual in the logs (what the same turn would
  // have cost without the skill), so this cannot prove the skill caused the
  // difference — it just flags turns that run heavier or lighter than baseline.
  avgTurnTokensVsBaselinePct: number | undefined;
}

function turnTokenWeight(e: UsageEvent): number {
  return e.inputTokens + e.outputTokens + e.cacheReadTokens + e.cacheWriteTokens;
}

export function computeSkillUsage(events: UsageEvent[]): SkillUsage[] {
  // No longer Claude-only: Copilot events get skillsUsed too (see copilotDb.ts's
  // <skill-context>-turn window matching), so both sources feed the same
  // baseline/cost aggregation here.
  const baselineTurns = events.filter((e) => !e.skillsUsed || e.skillsUsed.length === 0);
  const baselineAvgTokens =
    baselineTurns.length > 0
      ? baselineTurns.reduce((sum, e) => sum + turnTokenWeight(e), 0) / baselineTurns.length
      : undefined;

  const totalCostAll = events.reduce((sum, e) => {
    const cost = computeCost(e.inputTokens, e.outputTokens, e.cacheWriteTokens, e.cacheReadTokens, e.model);
    return cost !== undefined ? sum + cost : sum;
  }, 0);

  interface Accum {
    invocations: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    hasCost: boolean;
    turnTokensSum: number;
  }
  const bySkill = new Map<string, Accum>();
  for (const e of events) {
    if (!e.skillsUsed || e.skillsUsed.length === 0) {
      continue;
    }
    const cost = computeCost(e.inputTokens, e.outputTokens, e.cacheWriteTokens, e.cacheReadTokens, e.model);
    const tokens = turnTokenWeight(e);
    for (const skill of e.skillsUsed) {
      const entry: Accum =
        bySkill.get(skill) ?? { invocations: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, hasCost: false, turnTokensSum: 0 };
      entry.invocations += 1;
      entry.inputTokens += e.inputTokens;
      entry.outputTokens += e.outputTokens;
      entry.turnTokensSum += tokens;
      if (cost !== undefined) {
        entry.costUsd += cost;
        entry.hasCost = true;
      }
      bySkill.set(skill, entry);
    }
  }

  return Array.from(bySkill.entries())
    .map(([skill, v]) => {
      const avgTurnTokens = v.turnTokensSum / v.invocations;
      return {
        skill,
        invocations: v.invocations,
        inputTokens: v.inputTokens,
        outputTokens: v.outputTokens,
        costUsd: v.hasCost ? v.costUsd : undefined,
        pctOfTotalCost: v.hasCost && totalCostAll > 0 ? (v.costUsd / totalCostAll) * 100 : undefined,
        avgTurnTokens,
        avgTurnTokensVsBaselinePct:
          baselineAvgTokens !== undefined && baselineAvgTokens > 0
            ? ((avgTurnTokens - baselineAvgTokens) / baselineAvgTokens) * 100
            : undefined,
      };
    })
    .sort((a, b) => b.invocations - a.invocations);
}
