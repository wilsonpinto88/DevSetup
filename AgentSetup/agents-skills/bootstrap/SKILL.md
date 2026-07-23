---
name: bootstrap
description: >
  Scaffold feature documentation structure for PSM NG projects. Creates Plan/,
  Estimation_Progress/, Feature/ folders with templated files (design spec, implementation plan,
  progress tracker, README). Use when user says "bootstrap superpowers", "scaffold feature",
  "create feature docs", "new feature setup", or invokes /bootstrap. Requires: feature name,
  target directory, and brief description. Optionally accepts task list and estimates.
---

# Bootstrap Superpowers — Feature Documentation Scaffolding

## Purpose

Auto-generate the standard feature documentation skeleton used across PSM NG projects. Produces a consistent, ready-to-fill structure that matches the established template (reference: `Docs/Features/PSM_NG_Import_Risks_From_Project_Plan/`).

## Trigger

Activate when user says any of:
- "bootstrap superpowers"
- "scaffold feature"
- "create feature docs"
- "new feature setup"
- "/bootstrap"

## Required Inputs

Gather these before scaffolding (ask user if not provided):

| Input | Description | Example |
|---|---|---|
| `FEATURE_NAME` | Short feature identifier | "Actions Remove PSR Filter" |
| `TARGET_DIR` | Where to create the structure | `Docs/PSR/Feature/Actions` |
| `DESCRIPTION` | One-line summary | "Remove PSR dropdown filter from Actions screen" |
| `DATE` | ISO date (default: today) | `2026-07-13` |

## Optional Inputs

| Input | Description | Default |
|---|---|---|
| `TASKS` | List of tasks with estimates | Empty (fill later) |
| `APP_NAME` | Application name | "Project Status Review App" |
| `ENVIRONMENT` | Target environment | "MyApp-DEV" |
| `STATUS` | Initial status | "📋 Proposal — awaiting PM approval" |

## Output Structure

```
{TARGET_DIR}/
├── README.md
├── Plan/
│   ├── {DATE}-{slug}-design.md      ← Specs, architecture, acceptance criteria
│   └── {DATE}-{slug}-plan.md        ← Phased tasks with estimates
├── Estimation_Progress/
│   └── progress.md                   ← Progress tracker with efficiency metrics
└── Feature/
    └── (empty — implementation artifacts go here)
```

## File Templates

### README.md

```markdown
# Feature: {FEATURE_NAME}

## Summary

{DESCRIPTION}

## Folder Structure

\```
{FOLDER_NAME}/
├── README.md
├── Plan/
│   ├── {DATE}-{slug}-design.md   ← Specs & architecture
│   └── {DATE}-{slug}-plan.md     ← Implementation plan (tasks/phases)
├── Estimation_Progress/
│   └── progress.md               ← Progress tracker
└── Feature/
    └── (implementation artifacts)
\```

## Documents

| # | Document | Description |
|---|----------|-------------|
| 1 | [Design & Specs](Plan/{DATE}-{slug}-design.md) | Architecture, business rules, acceptance criteria |
| 2 | [Implementation Plan](Plan/{DATE}-{slug}-plan.md) | Phases, tasks, estimates |
| 3 | [Progress](Estimation_Progress/progress.md) | Current status, efficiency metrics |

## Context

- **App**: {APP_NAME}
- **Environment**: {ENVIRONMENT}
- **Date**: {DATE}
- **Status**: {STATUS}
```

### Plan/{DATE}-{slug}-design.md

```markdown
# PSM NG - {FEATURE_NAME} — Design

## Context

- Environment: {ENVIRONMENT}
- App: {APP_NAME}
- Date: {DATE}

## Problem

{DESCRIPTION}

## Scope

**In scope:**
- (fill)

**Non-goals:**
- (fill)

## Architecture

(describe current state, proposed change, affected components)

## Business Rules

| # | Rule | Change? |
|---|------|---------|
| BR-1 | (fill) | New / Unchanged |

## Acceptance Criteria

1. **AC-1**: (fill)

## Error Handling / Edge Cases

| Condition | Behavior |
|---|---|
| (fill) | (fill) |

## Failure-Mode Check

1. (adversarial review of what could go wrong)
```

### Plan/{DATE}-{slug}-plan.md

```markdown
# PSM NG - {FEATURE_NAME} — Implementation Plan

Design reference: [{DATE}-{slug}-design.md]({DATE}-{slug}-design.md)

## Phase 1 — (name)

| Task | Description | Est. |
|---|---|---:|
| Task 1 | (fill) | 1h |
| **Phase 1 total** | | **Xh** |

## Grand Total

**Xh** across N tasks, M phases.

## Verification Checklist (per task)

- Task 1: (how to verify it's done)
```

### Estimation_Progress/progress.md

```markdown
# PSM NG — {FEATURE_NAME} — Progress

Plan reference: [{DATE}-{slug}-plan.md](../Plan/{DATE}-{slug}-plan.md)
Started: N/A (provide exact date + time when work actually begins, e.g. "2026-07-13 09:00" — do not fill this in at scaffold time)

| Phase | Task | Description | Est. | Completed | Status |
|---|---|---|---:|---|---|
| **Phase 1 — (name)** | Task 1 | (fill) | 1h | — | ⏳ Pending approval |
| | **Phase 1 total** | | **Xh** | | |
| | **TOTAL** | | **Xh** | | **0/N done — awaiting PM approval** |

- **Completed**: filled with the real system-clock date + time (e.g. "2026-07-14 11:20") the moment a task flips to ✅ Done — never hand-typed or estimated. Stays `—` while a task is pending. This is the raw data the Dashboard (below) uses to build a pace-over-time view; don't skip it when marking a task Done.

## Efficiency Metric

| Metric | Value |
|---|---:|
| Elapsed capacity so far | N/A |
| Delivered (sum of ✅ Done task estimates) | 0h |
| Total estimate | Xh |
| Overall progress | 0% |
| Pace ratio | N/A |

**Pace Light**: ⚪ N/A — not enough data yet (needs `Started` + at least one Daily Log row)

| Pace ratio | Light | Meaning |
|---|:---:|---|
| < 0.80 | 🔴 Red | Behind pace — at risk of missing the estimate |
| 0.80 – 0.89 | 🟡 Yellow | Slightly behind — worth monitoring |
| 0.90 – 1.00 | 🟢 Green | On pace |
| > 1.00 | 🚀 Ahead | Delivering faster than estimated — ahead of pace |

Update the **Pace Light** line every time `Pace ratio` is recomputed (i.e. every time a task is marked ✅ Done) — pick the row whose range contains the current ratio, don't leave it stale from a previous update.

**Work Schedule** (fixed constant, applies to every feature — not configurable per-feature unless the user says otherwise):
- Monday–Friday, 09:00–18:00, with a 1h lunch break built in → 8h effective capacity per full business day.
- No capacity counted on weekends or outside this window.

**Formula** (recompute at the exact moment a task is marked ✅ Done — mid-day, not just at day's end or on request):
- `Elapsed capacity so far` = sum of the **Net Hours Worked** column in the Daily Log below, snapshotted using the real current system time at the moment of completion (fetch it fresh — don't reuse a stale "now" from earlier in the session). If `Started` is still N/A, this stays **N/A** — do not compute, guess, or default it.
- `Pace ratio` = Delivered ÷ Elapsed capacity so far — only once Elapsed capacity so far is a real measured number (i.e. the Daily Log has at least one row). If Elapsed capacity so far is N/A, Pace ratio is **N/A**. **> 1.0** = ahead of pace, **< 1.0** = behind pace, **≈ 1.0** = on pace.
- **Never** set Elapsed capacity so far equal to Delivered, and **never** substitute a default/assumed value for any field in this table. Every value is either summed from the Daily Log below, or N/A.
- This is estimate-vs-clock-time, not task-vs-task-estimate: `Delivered` only ever accumulates each task's *estimate* (never its actual duration), while `Elapsed capacity so far` only ever tracks real wall-clock time spent (via the Daily Log). So finishing a 2h-estimated task in 1h of real time, or a 15h-estimated task in 2h, both correctly push the ratio above 1.0 (ahead of pace) — because Delivered jumps by the full estimate while Elapsed only grew by the actual time spent. No per-task time tracking is needed beyond keeping the current day's Net Hours Worked current.

| Delivery Estimate | Date | Basis |
|---|---|---|
| Original delivery date | TBD | Pending PM approval |
| Current estimation | TBD | — |

## Daily Log

One row per calendar day from `Started` to the most recent update. This is the source of truth for `Elapsed capacity so far` above — don't maintain it separately from the metric.

| Date | Day | Scheduled Hours | Interruptions / Breaks | Net Hours Worked |
|---|---|---:|---|---:|
| (no rows yet — added once `Started` is provided) | | | | |
| | | | **Cumulative (→ Elapsed capacity so far)** | **Σh** |

- **Scheduled Hours**: 8h for Mon–Fri (per Work Schedule), 0h for Sat/Sun (no row needed for weekend days with 0h, or omit weekend rows entirely). On the `Started` day, scheduled hours run from the actual start time to 18:00 (minus lunch if it overlaps), not the full 8h.
- **Interruptions / Breaks**: meetings, extra breaks, leave, etc. that the user reports for that specific day — record duration and a short reason (e.g. "1h — sprint planning"). Only the standard 1h lunch is pre-built into Scheduled Hours; anything beyond that goes here. Never estimate or backfill — only log what the user actually reports.
- **Net Hours Worked** = Scheduled Hours − Interruptions/Breaks for that day. On the current (still in-progress) day, cap Scheduled Hours at the real elapsed time so far (via system clock), not the full day, since the day isn't over yet.
- Add a new row automatically when the day changes (per system clock), and update the current day's row + the Efficiency Metric every time a task is marked ✅ Done.

## Status

**{STATUS}** — documentation created {DATE}.
```

## Dashboard Generation

### Trigger

When the `TOTAL` row's Status becomes `N/N done` (i.e. every task in progress.md is ✅ Done), ask the user a yes/no question (via the ask-questions tool): **"All tasks complete for {FEATURE_NAME}. Generate performance dashboard?"**

- **Yes** → generate `{TARGET_DIR}/Estimation_Progress/dashboard.html` from the template below.
- **No / no response** → stop here, don't generate anything. The user can ask for it later at any time ("generate the dashboard").

### Data source

Everything comes from the already-populated progress.md — no new data entry required:
- Task table (Phase, Task, Est., **Completed** timestamp, Status)
- Daily Log (Date, Scheduled Hours, Interruptions/Breaks, Net Hours Worked)
- Final Efficiency Metric (Delivered, Elapsed capacity so far, Pace ratio, Pace Light)

Pace-over-time checkpoints are derived (not stored) by walking tasks in `Completed` order: each checkpoint's `delivered` = that task's estimate (the hours it contributes at the moment it's marked Done), and `paceRatio` = cumulative Delivered ÷ cumulative Elapsed capacity as of that timestamp (same formula as the Efficiency Metric, snapshotted at each completion instead of just the latest).

### Output template (`dashboard.html`)

Self-contained HTML file, Highcharts via CDN, no build step. Embed the raw structured data in a `<script type="application/json" id="feature-metrics">` block — this is the aggregation hook: a future multi-feature dashboard can scan sibling `Estimation_Progress/dashboard.html` files across a project, pull this JSON block out of each, and merge them into one view without re-parsing markdown. Keep this JSON schema stable once used.

Three charts:
1. **Double-ring donut** — inner ring: Total Estimate vs Elapsed Capacity (true donut hole, not filled center; labels shown as initials, e.g. "TE"/"EC", full name still available on hover); outer ring: one slice per task, sized by estimate, colored by its phase (adjacent shades so phases cluster visually).
2. **Phase bar chart** — Estimate vs Delivered per phase, grouped columns.
3. **Pace combo chart** — Delivered-per-checkpoint as columns (left axis) plus cumulative Pace Ratio as a line (right axis), one point per task completion — shows whether pace was improving or slipping over the course of the feature.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{FEATURE_NAME} — Performance Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/highcharts@11/highcharts.js"></script>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; background: #0f1117; color: #e6e6e6; }
  .cards { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
  .card { background: #1a1d27; border-radius: 8px; padding: 1rem 1.5rem; min-width: 160px; }
  .card h3 { margin: 0 0 .25rem; font-size: .85rem; color: #9aa0ab; font-weight: 500; }
  .card p { margin: 0; font-size: 1.6rem; font-weight: 700; }
  .charts-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .charts-row > div { flex: 1 1 380px; background: #1a1d27; border-radius: 8px; min-width: 0; }
  .chart-full { background: #1a1d27; border-radius: 8px; }
</style>
</head>
<body>
  <h1>{FEATURE_NAME} — Performance Dashboard</h1>
  <p>Completed {DATE} · Plan: <a href="../Plan/{DATE}-{slug}-plan.md">{DATE}-{slug}-plan.md</a></p>

  <div class="cards">
    <div class="card"><h3>Total Estimate</h3><p>{TOTAL_EST}h</p></div>
    <div class="card"><h3>Delivered</h3><p>{TOTAL_DELIVERED}h</p></div>
    <div class="card"><h3>Elapsed Capacity</h3><p>{ELAPSED_CAPACITY}h</p></div>
    <div class="card"><h3>Final Pace Ratio</h3><p>{FINAL_PACE_RATIO} {PACE_LIGHT}</p></div>
  </div>

  <div class="charts-row">
    <div id="donutChart" style="height:380px;"></div>
    <div id="phaseChart" style="height:380px;"></div>
  </div>
  <div class="chart-full" id="paceChart" style="height:380px;"></div>

  <script type="application/json" id="feature-metrics">
  {
    "feature": "{FEATURE_NAME}",
    "started": "{STARTED}",
    "completed": "{COMPLETED}",
    "totals": { "estimate": {TOTAL_EST}, "delivered": {TOTAL_DELIVERED}, "elapsedCapacity": {ELAPSED_CAPACITY} },
    "phases": [
      { "name": "Phase 1 — (name)", "estimate": 0, "delivered": 0, "color": "#5b8def" }
    ],
    "tasks": [
      { "phase": "Phase 1 — (name)", "name": "Task 1", "estimate": 0, "color": "#5b8def" }
    ],
    "paceOverTime": [
      { "timestamp": "{COMPLETED_TS}", "delivered": 0, "paceRatio": 0 }
    ]
  }
  </script>

  <script>
    const data = JSON.parse(document.getElementById('feature-metrics').textContent);

    Highcharts.setOptions({
      chart: { backgroundColor: '#1a1d27', style: { fontFamily: 'system-ui, sans-serif' } },
      title: { style: { color: '#e6e6e6' } },
      xAxis: { labels: { style: { color: '#e6e6e6' } }, lineColor: '#333', tickColor: '#333' },
      yAxis: { labels: { style: { color: '#e6e6e6' } }, gridLineColor: '#2a2d3a', title: { style: { color: '#9aa0ab' } } },
      legend: { itemStyle: { color: '#e6e6e6' }, itemHoverStyle: { color: '#fff' } },
      tooltip: { backgroundColor: '#1a1d27', style: { color: '#e6e6e6' } }
    });

    // Double-ring donut: inner ring = Total Estimate vs Elapsed Capacity, outer ring = per-task breakdown
    Highcharts.chart('donutChart', {
      chart: { type: 'pie' },
      title: { text: 'Estimate vs Elapsed Capacity — Overall & by Task' },
      tooltip: { pointFormat: '{series.name}: <b>{point.y}h</b> ({point.percentage:.0f}%)' },
      plotOptions: { pie: { dataLabels: { enabled: true, style: { color: '#e6e6e6', textOutline: 'none' }, distance: 12 } } },
      series: [
        {
          name: 'Overall',
          size: '45%',
          innerSize: '55%',
          data: [
            { name: 'Total Estimate', y: data.totals.estimate, color: '#5b8def' },
            { name: 'Elapsed Capacity', y: data.totals.elapsedCapacity, color: '#3ecf8e' }
          ],
          dataLabels: {
            distance: '-22%',
            style: { fontSize: '0.75em', fontWeight: '700' },
            formatter: function () { return this.point.name.split(' ').map(w => w[0]).join(''); }
          }
        },
        {
          name: 'Task',
          size: '80%',
          innerSize: '60%',
          data: data.tasks.map(t => ({ name: t.name, y: t.estimate, color: t.color }))
        }
      ]
    });

    // Estimate vs Delivered per phase
    Highcharts.chart('phaseChart', {
      chart: { type: 'column' },
      title: { text: 'Estimate vs Delivered per Phase' },
      xAxis: { categories: data.phases.map(p => p.name) },
      yAxis: { title: { text: 'Hours' } },
      series: [
        { name: 'Estimate (h)', data: data.phases.map(p => p.estimate), color: '#5b8def' },
        { name: 'Delivered (h)', data: data.phases.map(p => p.delivered), color: '#3ecf8e' }
      ]
    });

    // Delivered per checkpoint (bars) + cumulative Pace Ratio (line, secondary axis)
    Highcharts.chart('paceChart', {
      title: { text: 'Delivered per Checkpoint & Pace Ratio Over Time' },
      xAxis: { categories: data.paceOverTime.map(p => p.timestamp) },
      yAxis: [
        { title: { text: 'Delivered (h)', style: { color: '#5b8def' } } },
        { title: { text: 'Pace Ratio', style: { color: '#f2c94c' } }, opposite: true, gridLineWidth: 0 }
      ],
      series: [
        { name: 'Delivered (h)', type: 'column', yAxis: 0, color: '#5b8def', data: data.paceOverTime.map(p => p.delivered) },
        { name: 'Pace Ratio (>1.0 = ahead)', type: 'line', yAxis: 1, color: '#f2c94c', data: data.paceOverTime.map(p => p.paceRatio), marker: { enabled: true } }
      ]
    });
  </script>
</body>
</html>
```

### Future: cross-feature aggregation (not built yet)

When there's more than one completed feature, a separate step could scan every `**/Estimation_Progress/dashboard.html` under a project root, extract each `#feature-metrics` JSON block, and render a combined view (e.g. average pace ratio across features, total delivered vs estimated org-wide). Deferred until there's a second real dashboard to aggregate against — don't build speculative aggregation code now.

## Rules

1. **Minimum 1h per task** — group small tasks logically if needed
2. **Slug** = lowercase, hyphenated version of FEATURE_NAME (e.g. "actions-remove-psr-filter")
3. **Always create the `Feature/` folder** even if empty (placeholder for implementation artifacts)
4. **If tasks provided**, fill them into both plan and progress files
5. **If tasks not provided**, use placeholder rows with "(fill)" markers
6. **Date format**: YYYY-MM-DD in filenames, DD-MM-YYYY in prose only where locale demands it
7. **NEVER implement code as part of this skill** — regardless of how the user's request is phrased (even if it includes implementation details, "implement", "build", "code this", etc. earlier in the same message). This skill's scope ends at documentation.
8. **When a task is marked ✅ Done**, immediately (not batched, not deferred to day's end) record the real system-clock date+time in that task's `Completed` column, then recompute the Efficiency Metric table from the Daily Log (fixed Work Schedule: Mon–Fri, 09:00–18:00, 1h lunch). This means: update the current day's Net Hours Worked to reflect real elapsed time at the moment of completion, re-sum Elapsed capacity so far, re-add the task's full estimate to Delivered, and recompute Pace ratio — every single time, regardless of whether the task took more or less real time than its estimate. Never assume or default a value — if `Started` or a day's Interruptions/Breaks haven't been explicitly provided by the user, ask for it or leave the field as N/A. A metric showing a suspiciously round/trivial value (e.g. Pace ratio always exactly 1.0) is a sign it was assumed rather than measured — verify before writing it.
9. **When the last task is marked ✅ Done** (TOTAL becomes N/N done), ask the user (yes/no) whether to generate the performance dashboard — see "Dashboard Generation" above. Don't generate it unprompted, and don't skip asking.
10. **Timestamps come from the system clock, not hand-typed guesses.** When the user confirms "I'm starting now" (or similarly), fetch the real current time (e.g. `Get-Date` in PowerShell) and use that exact value for `Started` — don't ask the user to type a time themselves, and don't estimate one. Likewise, whenever `Elapsed capacity so far` is recomputed, fetch the current system time for "now" rather than assuming today's date is accurate. This only replaces *how the timestamp is captured*, not *whether work has started/stopped* — that decision, and all Interruptions/Stops entries, must still come from the user; there is no calendar access, idle-time detection, or presence monitoring available to infer it automatically.
11. **Emoji-safe editing**: progress.md is full of non-BMP emoji (🚀/🟢/🟡/🔴 in Pace Light, ✅/⏳ in Status) stored as UTF-16 surrogate pairs. When updating a row/cell that contains one, always replace the **entire row or cell** in a single oldString/newString pair — never a partial substring splice that could land mid-emoji, since a cut inside a surrogate pair silently corrupts it into a lone invalid surrogate (renders as �).

## Execution Steps

1. Collect/confirm required inputs (ask if missing)
2. Generate slug from FEATURE_NAME
3. Create folders: `{TARGET_DIR}/Plan/`, `{TARGET_DIR}/Estimation_Progress/`, `{TARGET_DIR}/Feature/`
4. Create files from templates, substituting variables
5. Report created structure to user
6. **Ask the user**: "Documentation scaffolded. Ready to start implementation?" (yes/no question, using the ask-questions tool if available)
   - If **yes**: proceed to implement the feature, following standard workflow (TDD, security gates, workflow routing from CLAUDE.MD)
   - If **no** (or no response yet): stop here. Do not write or modify any code. Wait for the user's next explicit instruction.
6. Update `/memories/repo/state.md` with new feature reference
