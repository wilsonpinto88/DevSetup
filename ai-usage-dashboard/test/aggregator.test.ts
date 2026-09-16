import { describe, it, expect } from 'vitest';
import { UsageEvent } from '../src/logScanner/types';
import { computeTotals, groupByModel, groupByWorkspace, computeDailySeries } from '../src/aggregator';

function event(overrides: Partial<UsageEvent>): UsageEvent {
  return {
    source: 'claude-code',
    sessionId: 's1',
    timestamp: '2026-09-10T00:00:00.000Z',
    model: 'claude-sonnet-5',
    workspace: 'Fabasoft_WS',
    inputTokens: 10,
    outputTokens: 5,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    ...overrides,
  };
}

describe('computeTotals', () => {
  it('sums tokens and counts distinct sessions across sources', () => {
    const events = [
      event({ sessionId: 'a', inputTokens: 10, outputTokens: 5 }),
      event({ sessionId: 'a', inputTokens: 3, outputTokens: 1 }),
      event({ sessionId: 'b', source: 'copilot', inputTokens: 7, outputTokens: 0, nanoAiu: 100, premiumRequests: 1 }),
    ];
    const totals = computeTotals(events);
    expect(totals.totalInputTokens).toBe(20);
    expect(totals.totalOutputTokens).toBe(6);
    expect(totals.totalNanoAiu).toBe(100);
    expect(totals.totalPremiumRequests).toBe(1);
    expect(totals.sessionCount).toBe(2);
  });
});

describe('groupByModel / groupByWorkspace', () => {
  it('groups and sums by model, sorted descending by total tokens', () => {
    const events = [
      event({ model: 'claude-haiku-4.5', inputTokens: 1, outputTokens: 1 }),
      event({ model: 'claude-sonnet-5', inputTokens: 50, outputTokens: 50 }),
    ];
    const grouped = groupByModel(events);
    expect(grouped[0].key).toBe('claude-sonnet-5');
    expect(grouped[0].inputTokens).toBe(50);
    expect(grouped[1].key).toBe('claude-haiku-4.5');
  });

  it('groups by workspace', () => {
    const events = [event({ workspace: 'WS_PSM' }), event({ workspace: 'Fabasoft_WS' })];
    const grouped = groupByWorkspace(events);
    expect(grouped.map((g) => g.key).sort()).toEqual(['Fabasoft_WS', 'WS_PSM']);
  });
});

describe('computeDailySeries', () => {
  const now = new Date('2026-09-16T12:00:00.000Z');

  it('buckets by day for the week range and excludes events outside it', () => {
    const events = [
      event({ timestamp: '2026-09-15T00:00:00.000Z' }),
      event({ timestamp: '2026-08-01T00:00:00.000Z' }), // outside 7-day window
    ];
    const series = computeDailySeries(events, 'week', now);
    expect(series).toHaveLength(1);
    expect(series[0].bucket).toBe('2026-09-15');
  });

  it('buckets by week for the 6months range', () => {
    const events = [event({ timestamp: '2026-08-10T00:00:00.000Z' })];
    const series = computeDailySeries(events, '6months', now);
    expect(series).toHaveLength(1);
    // Monday of the week containing 2026-08-10
    expect(series[0].bucket).toBe('2026-08-10');
  });

  it('counts distinct sessions per bucket', () => {
    const events = [
      event({ sessionId: 'a', timestamp: '2026-09-15T01:00:00.000Z' }),
      event({ sessionId: 'a', timestamp: '2026-09-15T02:00:00.000Z' }),
      event({ sessionId: 'b', timestamp: '2026-09-15T03:00:00.000Z' }),
    ];
    const series = computeDailySeries(events, 'week', now);
    expect(series[0].sessionCount).toBe(2);
  });
});
