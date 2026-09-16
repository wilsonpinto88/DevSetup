import { UsageEvent } from './logScanner/types';

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

export function filterEventsByRange(
  events: UsageEvent[],
  range: TimeRange,
  now: Date = new Date()
): UsageEvent[] {
  const rangeDays = range === 'week' ? 7 : range === 'month' ? 30 : 180;
  const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  return events.filter((e) => {
    const ts = new Date(e.timestamp);
    return ts >= cutoff && ts <= now;
  });
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

  return Array.from(bucketed.entries())
    .map(([bucket, v]) => ({
      bucket,
      inputTokens: v.inputTokens,
      outputTokens: v.outputTokens,
      sessionCount: v.sessionIds.size,
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}
