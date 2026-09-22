# AI Usage Dashboard

A local VS Code extension that shows your own Claude Code and GitHub Copilot usage — tokens, API-equivalent cost, daily activity, usage by model/workspace, and which skills you've been invoking.

Everything is read from log files already on your machine (`~/.claude/projects`, `~/.copilot/session-store.db`). No telemetry, no server, no account other than what's already signed into your local CLIs. Each person only ever sees their own data.

## Install

You'll be given a `.vsix` file (e.g. `ai-usage-dashboard-0.1.0.vsix`) — this isn't published to the Marketplace.

**Option A — command line:**
```
code --install-extension ai-usage-dashboard-0.1.0.vsix
```

**Option B — VS Code UI:**
1. Open the Extensions view (`Ctrl+Shift+X`)
2. Click the `...` menu at the top → **Install from VSIX...**
3. Pick the `.vsix` file

## Use

1. Open the Command Palette (`Ctrl+Shift+P`)
2. Run **AI Usage: Open Dashboard**
3. Use the toolbar to filter by source (All / Claude Code / Copilot) and time range (This Week / This Month / 6 Months)

Other commands:
- **AI Usage: Refresh Now** — rescan logs immediately
- **AI Usage: Reset Cache & Rescan** — wipe the incremental scan cache and rebuild from scratch (use this if numbers look wrong or stuck)

## What it shows

- **Stat tiles** — messages, tokens, cache hit rate, sessions, API-equivalent cost
- **Cost Composition** — cost breakdown by input/output/cache-read/cache-write
- **Daily Usage** — token activity over the selected range
- **Model Usage** — per-model breakdown; models without a confirmed public price show `—` instead of a guessed cost
- **Usage by Workspace** — which projects you've used AI in
- **Skills Used** — Claude Code only; which skills (via the `Skill` tool) you invoke most, their token/cost share, and a rough "tokens per turn vs. no-skill turns" signal (a proxy, not a measured saving)

## Fixed issues

- **Copilot totals were previously inflated (fixed).** The Copilot CLI's telemetry writer sometimes logs the same call twice with an identical payload (a retry) — confirmed via direct SQL against `session-store.db`, ~300 credits' worth of pure double-counting in one real month of data. Duplicate rows (same session/timestamp/model/token counts) are now deduped, keeping only the first. Separately, calls with `request_multiplier` of `0`/`null` (not billed by GitHub as premium) were still contributing to the AI-units total — those are now excluded from that count, though their token counts are still kept since real usage happened.
  **If you installed an earlier build**: run **AI Usage: Reset Cache & Rescan** once — your already-scanned data predates this fix and won't correct itself on a normal refresh.

## Known limitations — please read before giving feedback

- **"API-Equivalent Cost" is not a real bill.** It's Anthropic's public per-token API pricing applied to your token counts. If you're on a flat-fee plan (e.g. Claude Pro), you are not actually being charged this — it's a comparison figure only.
- **Copilot doesn't bill per-token at all** — it bills in premium requests, weighted by a per-model multiplier (e.g. Sonnet ~9x, Opus ~27x, small models ~0.3x), nothing to do with token counts. Copilot models have no entry in the Anthropic pricing table, so their cost tile correctly shows `—` rather than a wrong dollar figure. Real usage is tracked as **Copilot Premium Reqs** (a separate stat tile) instead.
- **Copilot allowance % is manual-entry only** (`aiUsage.copilotMonthlyAllowance` setting for the total). There's no public API for a personal GitHub account's real billed usage — only org/enterprise admin APIs exist, and the authoritative source is GitHub's own Settings → Billing → Copilot page. The "used" side of the % is your real local premium-request count, so it moves even without the manual total being exact.
- **"Skills Used" is Claude Code only.** Copilot has no equivalent structured skill-invocation record in its logs.
- Only models with a confirmed public pricing rate get a $ figure; others show `—` rather than a guessed number.

## Settings

| Setting | Default | Purpose |
|---|---|---|
| `aiUsage.copilotMonthlyAllowance` | `null` | Manual Copilot allowance fallback |
| `aiUsage.autoRefreshMinutes` | `0` | Auto-refresh interval; `0` disables it |
| `aiUsage.claudeLogsPath` | `""` (uses `~/.claude/projects`) | Override Claude Code logs location |
| `aiUsage.copilotLogsPath` | `""` (uses `~/.copilot/session-store.db`) | Override Copilot logs location |

## Feedback

This is an early, unpublished build — please flag anything that looks wrong (numbers that don't match what you'd expect, missing workspaces, broken toggles) rather than assuming it's intentional.

## Building it yourself

```
npm install
npm test        # vitest — should be all green
npm run compile # tsc
npx vsce package # produces ai-usage-dashboard-<version>.vsix
```
