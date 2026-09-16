// ai-usage-dashboard/src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { scanAll } from './logScanner/logRepository';
import { ScanCache } from './logScanner/scanCache';
import { CopilotDbCursor } from './logScanner/copilotDb';
import { computeTotals, groupByModel, groupByWorkspace, computeDailySeries, filterEventsByRange, TimeRange } from './aggregator';
import { resolveAllowance } from './copilotAllowance';
import { computeCost, computeCostBreakdown, CostBreakdown } from './pricing';
import { createOrShowPanel, postDashboardData, SourceFilter, ModelUsageEntry } from './webviewPanel';
import { UsageEvent } from './logScanner/types';

const SCAN_CACHE_KEY = 'aiUsage.scanCache';
const EVENTS_KEY = 'aiUsage.accumulatedEvents';
const COPILOT_CURSOR_KEY = 'aiUsage.copilotCursor';
const outputChannel = vscode.window.createOutputChannel('AI Usage Dashboard');
let scanCacheMemo: ScanCache = {};
let copilotCursorMemo: CopilotDbCursor = { lastId: 0 };

// scanAll only returns bytes appended since the last scan (see scanCache.ts),
// so each call's `events` is a delta, not the full picture — it must be
// accumulated across refreshes, not treated as the complete dataset.
let accumulatedEvents: UsageEvent[] = [];

// Remembered so aiUsage.refresh / aiUsage.resetCache / the auto-refresh timer
// re-render with whatever the user last selected, instead of always resetting
// back to month/all.
let lastRange: TimeRange = 'month';
let lastSource: SourceFilter = 'all';

function resolveDefaultPath(configuredOverride: string, defaultRelativeToHome: string): string {
  return configuredOverride && configuredOverride.trim().length > 0
    ? configuredOverride
    : path.join(os.homedir(), ...defaultRelativeToHome.split('/'));
}

async function refreshAndRender(context: vscode.ExtensionContext, range: TimeRange, source: SourceFilter) {
  lastRange = range;
  lastSource = source;
  const config = vscode.workspace.getConfiguration('aiUsage');
  const claudeRoot = resolveDefaultPath(config.get<string>('claudeLogsPath', ''), '.claude/projects');
  const copilotDbPath = resolveDefaultPath(config.get<string>('copilotLogsPath', ''), '.copilot/session-store.db');

  const priorCache = context.globalState.get<ScanCache>(SCAN_CACHE_KEY, scanCacheMemo);
  const priorCopilotCursor = context.globalState.get<CopilotDbCursor>(COPILOT_CURSOR_KEY, copilotCursorMemo);
  const priorCacheFileCount = Object.keys(priorCache).length;
  const priorAccumulatedCount = accumulatedEvents.length;
  const { events: newEvents, cache, copilotCursor, copilotError } = scanAll(
    claudeRoot,
    copilotDbPath,
    priorCache,
    priorCopilotCursor
  );
  accumulatedEvents = accumulatedEvents.concat(newEvents);
  const events = source === 'all' ? accumulatedEvents : accumulatedEvents.filter((e) => e.source === source);
  scanCacheMemo = cache;
  copilotCursorMemo = copilotCursor;
  await context.globalState.update(SCAN_CACHE_KEY, cache);
  await context.globalState.update(EVENTS_KEY, accumulatedEvents);
  await context.globalState.update(COPILOT_CURSOR_KEY, copilotCursor);

  outputChannel.appendLine(
    `[${new Date().toISOString()}] refresh(range=${range}) claudeRoot=${claudeRoot} copilotDbPath=${copilotDbPath} ` +
      `priorCacheFiles=${priorCacheFileCount} priorAccumulated=${priorAccumulatedCount} newEvents=${newEvents.length} ` +
      `totalAccumulated=${accumulatedEvents.length} nowCacheFiles=${Object.keys(cache).length} copilotCursor=${copilotCursor.lastId}` +
      (copilotError ? ` copilotError=${copilotError}` : '')
  );

  const manualAllowance = config.get<number | null>('copilotMonthlyAllowance', null);
  const allowance = await resolveAllowance({
    getGithubToken: async () => {
      const session = await vscode.authentication.getSession('github', ['read:user'], { createIfNone: false });
      return session?.accessToken;
    },
    fetchAllowance: async () => {
      // Exact endpoint TBD (see spec's Interfaces section) — returning undefined
      // triggers the manual-allowance fallback until this is filled in.
      return undefined;
    },
    manualAllowance: manualAllowance ?? undefined,
  });

  const rangeEvents = filterEventsByRange(events, range);
  const byModelRaw = groupByModel(rangeEvents);
  const byModel: ModelUsageEntry[] = byModelRaw.map((g) => ({
    ...g,
    costUsd: computeCost(g.inputTokens, g.outputTokens, g.cacheWriteTokens, g.cacheReadTokens, g.key),
  }));
  const knownCosts = byModel.map((m) => m.costUsd).filter((c): c is number => c !== undefined);
  const totalCostUsd = knownCosts.length > 0 ? knownCosts.reduce((sum, c) => sum + c, 0) : undefined;

  const breakdowns = byModelRaw
    .map((g) => computeCostBreakdown(g.inputTokens, g.outputTokens, g.cacheWriteTokens, g.cacheReadTokens, g.key))
    .filter((b): b is CostBreakdown => b !== undefined);
  const costBreakdown: CostBreakdown | undefined =
    breakdowns.length > 0
      ? breakdowns.reduce(
          (acc, b) => ({
            inputUsd: acc.inputUsd + b.inputUsd,
            outputUsd: acc.outputUsd + b.outputUsd,
            cacheWriteUsd: acc.cacheWriteUsd + b.cacheWriteUsd,
            cacheReadUsd: acc.cacheReadUsd + b.cacheReadUsd,
          }),
          { inputUsd: 0, outputUsd: 0, cacheWriteUsd: 0, cacheReadUsd: 0 }
        )
      : undefined;

  postDashboardData(context, {
    totals: computeTotals(rangeEvents),
    totalCostUsd,
    costBreakdown,
    byModel,
    byWorkspace: groupByWorkspace(rangeEvents),
    dailySeries: computeDailySeries(events, range),
    range,
    source,
    allowance,
  });
}

export function activate(context: vscode.ExtensionContext) {
  scanCacheMemo = context.globalState.get<ScanCache>(SCAN_CACHE_KEY, {});
  accumulatedEvents = context.globalState.get<UsageEvent[]>(EVENTS_KEY, []);
  copilotCursorMemo = context.globalState.get<CopilotDbCursor>(COPILOT_CURSOR_KEY, { lastId: 0 });

  context.subscriptions.push(
    vscode.commands.registerCommand('aiUsage.open', async () => {
      createOrShowPanel(context, async (range: TimeRange, source: SourceFilter) => {
        await refreshAndRender(context, range, source);
      });
      await refreshAndRender(context, lastRange, lastSource);
    }),
    vscode.commands.registerCommand('aiUsage.refresh', async () => {
      await refreshAndRender(context, lastRange, lastSource);
    }),
    vscode.commands.registerCommand('aiUsage.resetCache', async () => {
      scanCacheMemo = {};
      accumulatedEvents = [];
      copilotCursorMemo = { lastId: 0 };
      await context.globalState.update(SCAN_CACHE_KEY, {});
      await context.globalState.update(EVENTS_KEY, []);
      await context.globalState.update(COPILOT_CURSOR_KEY, { lastId: 0 });
      outputChannel.appendLine(`[${new Date().toISOString()}] cache reset — next refresh does a full rescan`);
      await refreshAndRender(context, lastRange, lastSource);
    })
  );

  const autoRefreshMinutes = vscode.workspace.getConfiguration('aiUsage').get<number>('autoRefreshMinutes', 0);
  if (autoRefreshMinutes > 0) {
    const intervalMs = autoRefreshMinutes * 60 * 1000;
    const timer = setInterval(() => {
      refreshAndRender(context, lastRange, lastSource);
    }, intervalMs);
    context.subscriptions.push({ dispose: () => clearInterval(timer) });
  }
}

export function deactivate() {
  // No explicit teardown needed — subscriptions handle disposal.
}
