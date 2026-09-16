// ai-usage-dashboard/src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { scanAll } from './logScanner/logRepository';
import { ScanCache } from './logScanner/scanCache';
import { computeTotals, groupByModel, groupByWorkspace, computeDailySeries, TimeRange } from './aggregator';
import { resolveAllowance } from './copilotAllowance';
import { createOrShowPanel, postDashboardData } from './webviewPanel';
import { UsageEvent } from './logScanner/types';

const SCAN_CACHE_KEY = 'aiUsage.scanCache';
const EVENTS_KEY = 'aiUsage.accumulatedEvents';
let scanCacheMemo: ScanCache = {};

// scanAll only returns bytes appended since the last scan (see scanCache.ts),
// so each call's `events` is a delta, not the full picture — it must be
// accumulated across refreshes, not treated as the complete dataset.
let accumulatedEvents: UsageEvent[] = [];

function resolveDefaultPath(configuredOverride: string, defaultRelativeToHome: string): string {
  return configuredOverride && configuredOverride.trim().length > 0
    ? configuredOverride
    : path.join(os.homedir(), ...defaultRelativeToHome.split('/'));
}

async function refreshAndRender(context: vscode.ExtensionContext, range: TimeRange) {
  const config = vscode.workspace.getConfiguration('aiUsage');
  const claudeRoot = resolveDefaultPath(config.get<string>('claudeLogsPath', ''), '.claude/projects');
  const copilotRoot = resolveDefaultPath(config.get<string>('copilotLogsPath', ''), '.copilot/session-state');

  const priorCache = context.globalState.get<ScanCache>(SCAN_CACHE_KEY, scanCacheMemo);
  const { events: newEvents, cache } = scanAll(claudeRoot, copilotRoot, priorCache);
  accumulatedEvents = accumulatedEvents.concat(newEvents);
  const events = accumulatedEvents;
  scanCacheMemo = cache;
  await context.globalState.update(SCAN_CACHE_KEY, cache);
  await context.globalState.update(EVENTS_KEY, accumulatedEvents);

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

  postDashboardData(context, {
    totals: computeTotals(events),
    byModel: groupByModel(events),
    byWorkspace: groupByWorkspace(events),
    dailySeries: computeDailySeries(events, range),
    range,
    allowance,
  });
}

export function activate(context: vscode.ExtensionContext) {
  scanCacheMemo = context.globalState.get<ScanCache>(SCAN_CACHE_KEY, {});
  accumulatedEvents = context.globalState.get<UsageEvent[]>(EVENTS_KEY, []);

  context.subscriptions.push(
    vscode.commands.registerCommand('aiUsage.open', async () => {
      createOrShowPanel(context, async (range: TimeRange) => {
        await refreshAndRender(context, range);
      });
      await refreshAndRender(context, 'month');
    }),
    vscode.commands.registerCommand('aiUsage.refresh', async () => {
      await refreshAndRender(context, 'month');
    })
  );

  const autoRefreshMinutes = vscode.workspace.getConfiguration('aiUsage').get<number>('autoRefreshMinutes', 0);
  if (autoRefreshMinutes > 0) {
    const intervalMs = autoRefreshMinutes * 60 * 1000;
    const timer = setInterval(() => {
      refreshAndRender(context, 'month');
    }, intervalMs);
    context.subscriptions.push({ dispose: () => clearInterval(timer) });
  }
}

export function deactivate() {
  // No explicit teardown needed — subscriptions handle disposal.
}
