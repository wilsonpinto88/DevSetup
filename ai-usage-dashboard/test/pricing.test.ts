import { describe, it, expect } from 'vitest';
import { computeCost, computeCostBreakdown, getModelPricing } from '../src/pricing';

describe('getModelPricing', () => {
  it('returns known rates for claude-sonnet-5', () => {
    expect(getModelPricing('claude-sonnet-5')).toEqual({
      inputPerM: 3,
      outputPerM: 15,
      cacheWritePerM: 3.75,
      cacheReadPerM: 0.3,
    });
  });

  it('returns undefined for an unknown model', () => {
    expect(getModelPricing('some-future-model')).toBeUndefined();
  });
});

describe('computeCost', () => {
  it('computes cost from token counts at the known rate', () => {
    // 1,000,000 of each token type at claude-sonnet-5 rates = 3 + 15 + 3.75 + 0.3
    const cost = computeCost(1_000_000, 1_000_000, 1_000_000, 1_000_000, 'claude-sonnet-5');
    expect(cost).toBeCloseTo(22.05, 5);
  });

  it('returns undefined for an unknown model instead of guessing', () => {
    expect(computeCost(100, 100, 0, 0, 'unknown-model')).toBeUndefined();
  });

  it('handles zero tokens', () => {
    expect(computeCost(0, 0, 0, 0, 'claude-sonnet-5')).toBe(0);
  });
});

describe('computeCostBreakdown', () => {
  it('splits cost by category at the known rate', () => {
    const breakdown = computeCostBreakdown(1_000_000, 1_000_000, 1_000_000, 1_000_000, 'claude-sonnet-5');
    expect(breakdown).toEqual({
      inputUsd: 3,
      outputUsd: 15,
      cacheWriteUsd: 3.75,
      cacheReadUsd: 0.3,
    });
  });

  it('returns undefined for an unknown model', () => {
    expect(computeCostBreakdown(100, 100, 0, 0, 'unknown-model')).toBeUndefined();
  });
});
