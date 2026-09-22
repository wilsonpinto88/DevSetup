# AI Usage Dashboard (VS Code extension) — Design

Date: 2026-09-16
Status: Approved (pending final user sign-off on written spec)

## Problem

User wants a VS Code panel like the "Copilot Cost Lens" screenshot they shared: spend/credits, model breakdown, per-workspace cost, daily spend chart, session/activity counts — but for **both** Claude Code and GitHub Copilot, sourced entirely from **local** logs already on disk (no GitHub org API, no auth setup).

## Scope

- New standalone VS Code extension (webview panel), reading:
  - Claude Code: `~/.claude/projects/**/*.jsonl`
  - GitHub Copilot (CLI/agent): `~/.copilot/session-state/*/events.jsonl` (+ sibling `workspace.yaml` for workspace path)
- Metrics shown: token usage (input/output/cache read/cache write) and Copilot's native `totalNanoAiu` / `totalPremiumRequests`, broken down by:
  - Model (`claude-sonnet-5`, `claude-opus-5`, etc.)
  - Workspace (grouped by normalized `cwd`/`git_root` basename, e.g. `Fabasoft_WS`, `WS_PSM`)
  - Day (for a daily spend/activity chart)
  - Session (count, list, last-active time)
- Manual refresh + optional interval auto-refresh.
- Real Copilot credit allowance/used% via VS Code's existing GitHub auth session (`vscode.authentication.getSession('github', ...)`) — same mechanism the native Copilot status bar tooltip uses to show "3,633.2 / 30,000 used". Falls back to manual entry if the endpoint is unavailable.

## Non-goals (v1)

- No dollar-cost for Claude Code usage — plan pricing isn't in the local logs and subscription plans vary; token counts only.
- No GitHub org Copilot billing API integration — everything is local-log-derived.
- No cross-machine aggregation — only logs on the machine the extension runs on.
- No backfill for Copilot sessions already pruned/deleted from `~/.copilot/session-state/` — Copilot appears to retain a rolling window, not full history; dashboard reports what's present, doesn't claim completeness.
- No live streaming/tailing daemon — refresh is on-demand or timer-based re-scan, not a background watcher process.

## Approach

**Pure TypeScript VS Code extension, parsing logs in-process, incremental caching via `globalState`.**

- Activation: on VS Code startup or command `aiUsage.open`.
- A `LogScanner` module walks both log roots, tracks `{filePath, lastByteOffset, mtime}` per file in extension `globalState` so repeat scans only read new bytes appended since last run (both JSONL sources are append-only).
- Parsed records normalize into one shape:
  ```ts
  interface UsageEvent {
    source: 'claude-code' | 'copilot';
    sessionId: string;
    timestamp: string;      // ISO
    model: string;
    workspace: string;      // normalized basename, see below
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    nanoAiu?: number;       // Copilot only
    premiumRequests?: number; // Copilot only
  }
  ```
- Aggregation module computes: totals, cost-by-workspace, cost-by-model, daily series, session/activity counts — all pure functions over `UsageEvent[]`, unit-testable without VS Code APIs.
- Webview renders with Chart.js (MIT, bundled locally — required for VS Code webview CSP), styled to match VS Code theme tokens (dark/light). Configured for Highcharts-like fluidity: `tension: 0.4` on line charts for smooth curves, `animation.duration: 750` with `easing: 'easeOutQuart'` on data updates, gradient area fills, and `hover.mode: 'index'` for smooth crosshair tooltips.

### Time-range toggle

Daily spend and activity charts each get a top-right toggle: **Week / Month / 6 Months**. Toggle re-aggregates the already-loaded `UsageEvent[]` client-side (no re-scan) — Week/Month bucket by day, 6 Months buckets by week for readability. Default: Month.

### Workspace normalization

Claude Code's `cwd` (e.g. `c:\DEV\Fabasoft_WS`) and Copilot's `workspace.yaml` `git_root`/`cwd` (e.g. `C:\Users\...\DevSetup\.worktrees\...`) differ in case and depth. Normalize by: lowercase, resolve to `git_root` when Copilot provides one (else `cwd`), then take the final path segment as the display label — matching the screenshot's short names (`WS_PSM`, `Fabasoft_WS`). Full normalized path kept internally for correctness; only the basename is displayed.

### Data flow

```
~/.claude/projects/**/*.jsonl  ─┐
                                 ├─> LogScanner (incremental) ─> UsageEvent[] ─> Aggregator ─> Webview (Chart.js)
~/.copilot/session-state/*/events.jsonl + workspace.yaml ─┘
```

## Interfaces

- Command: `AI Usage: Open Dashboard` (`aiUsage.open`)
- Command: `AI Usage: Refresh Now` (`aiUsage.refresh`)
- `CopilotAllowanceFetcher` module: acquires GitHub auth session via `vscode.authentication.getSession('github', ['read:user'], { createIfNone: false })`, calls the same internal endpoint the Copilot status bar uses (exact URL/response shape TBD during implementation — inspect via network trace of VS Code's own Copilot extension) to get `{used, total}` credits.
- Setting: `aiUsage.copilotMonthlyAllowance` (number, credits) — manual fallback only, used when auto-fetch fails/endpoint unavailable; defaults to unset (bar hidden if both unset)
- Setting: `aiUsage.autoRefreshMinutes` (number, default 0 = off)
- Setting: `aiUsage.claudeLogsPath` / `aiUsage.copilotLogsPath` — override default `~/.claude/projects` / `~/.copilot/session-state` for non-default install locations

## Error handling

- Missing log directories (Claude Code or Copilot not installed/never run): show that source's panel section as "No data found" instead of failing the whole dashboard — sources are independent.
- Malformed JSONL line: skip line, continue parsing (both are append-only logs from trusted local tools, but partial writes during active sessions are expected — skip-and-continue is correct, not an error to surface).
- File read errors (permissions, locked file mid-write): log to extension output channel, skip that file for this scan pass, retry next scan.
- Copilot allowance endpoint fails (404/auth error/shape change — it's undocumented/internal): log once to output channel, silently fall back to `aiUsage.copilotMonthlyAllowance` setting if set, else hide the allowance bar. Never blocks the rest of the dashboard.

## Failure-mode check

1. **Copilot log retention window** — if Copilot prunes session-state directories after N days, "daily spend" history will show real gaps that aren't outages. *Severity: minor* — documented as a non-goal (no backfill claim); dashboard shows what's on disk, mirrors what a human would see.
2. **Large history parse cost on first run** — a machine with months of Claude Code sessions could have a slow first scan. *Severity: minor for v1* — incremental byte-offset caching (see Architecture) means only the *first* scan is slow; every scan after is fast. Acceptable for v1; can add a progress indicator if first-run time proves annoying.
3. **Workspace basename collisions** — two different full paths with the same final segment (e.g. two different `WS_PSM` checkouts) would merge in the UI. *Severity: minor* — matches the reference screenshot's own behavior (it also groups by short name); full path available on hover/tooltip as disambiguation.

4. **Undocumented allowance endpoint breaks or requires unexpected scopes** — GitHub could change/remove the internal endpoint the status bar uses without notice, or require a scope VS Code's default GitHub session doesn't have. *Severity: minor* — manual-entry fallback (Error handling above) covers this; allowance is a supplementary metric, not core to the dashboard's main value (token/model/workspace breakdowns still work fully without it).

No critical failure modes found — proceeding.

## Testing strategy

- Unit tests (pure functions, no VS Code host needed): `LogScanner` parsing against fixture JSONL files (including malformed-line cases), `Aggregator` against known `UsageEvent[]` fixtures with hand-computed expected totals.
- Manual verification in Extension Development Host: open real `~/.claude` and `~/.copilot` data, confirm dashboard numbers are plausible against a manual `wc -l`/grep spot-check on the same files.
- Manual check: time-range toggle (Week/Month/6 Months) re-buckets correctly against known fixture dates spanning >6 months.

## Rollout

- New extension, no migration. Ship as a local/unpublished VSIX first (`vsce package`, install via `code --install-extension`); publish to marketplace only if user later decides to.
