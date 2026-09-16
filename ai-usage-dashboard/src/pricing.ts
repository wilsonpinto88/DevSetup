export interface ModelPricing {
  inputPerM: number;
  outputPerM: number;
  cacheWritePerM: number;
  cacheReadPerM: number;
}

// Published Anthropic per-million-token rates. Only models with confirmed
// rates are listed — an unknown model returns undefined cost rather than a
// guessed number, since getting a dollar figure wrong is worse than omitting it.
export const PRICING_TABLE: Record<string, ModelPricing> = {
  'claude-sonnet-5': { inputPerM: 3, outputPerM: 15, cacheWritePerM: 3.75, cacheReadPerM: 0.3 },
};

export function getModelPricing(model: string): ModelPricing | undefined {
  return PRICING_TABLE[model];
}

export interface CostBreakdown {
  inputUsd: number;
  outputUsd: number;
  cacheWriteUsd: number;
  cacheReadUsd: number;
}

export function computeCostBreakdown(
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens: number,
  cacheReadTokens: number,
  model: string
): CostBreakdown | undefined {
  const pricing = getModelPricing(model);
  if (!pricing) {
    return undefined;
  }
  return {
    inputUsd: (inputTokens * pricing.inputPerM) / 1_000_000,
    outputUsd: (outputTokens * pricing.outputPerM) / 1_000_000,
    cacheWriteUsd: (cacheWriteTokens * pricing.cacheWritePerM) / 1_000_000,
    cacheReadUsd: (cacheReadTokens * pricing.cacheReadPerM) / 1_000_000,
  };
}

export function computeCost(
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens: number,
  cacheReadTokens: number,
  model: string
): number | undefined {
  const breakdown = computeCostBreakdown(inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens, model);
  if (!breakdown) {
    return undefined;
  }
  return breakdown.inputUsd + breakdown.outputUsd + breakdown.cacheWriteUsd + breakdown.cacheReadUsd;
}
