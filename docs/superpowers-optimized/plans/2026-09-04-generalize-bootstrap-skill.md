# Generalize Bootstrap Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-optimized:subagent-driven-development (recommended) or superpowers-optimized:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove PSM-NG-specific naming/defaults from the `bootstrap` skill so it scaffolds feature docs for any project, while leaving its pace-tracking and dashboard mechanics untouched.

**Architecture:** Single source-of-truth file (`.agents/skills/bootstrap/SKILL.md`) gets edited in place, then the exact same content is copied to its two mirrors (`.copilot/skills/bootstrap/SKILL.md`, `AgentSetup/agents-skills/bootstrap/SKILL.md`). No new files, no code (this is a markdown skill-definition file), no automated test suite — verification is grep-based (confirm PSM-NG strings are gone, confirm the four dashboard JS numeric literals are correctly parameterized) plus a manual scaffold smoke test.

**Tech Stack:** Markdown (skill definition + embedded HTML/JS template inside a fenced code block), PowerShell (file sync).

**Assumptions:**
- Assumes `.agents/skills/bootstrap/SKILL.md` is still byte-identical to what was read during design (verified in Task 1, Step 1) — will NOT apply cleanly if it changed since.
- Assumes edits are additive/renaming only, not restructuring the file's section order — will NOT match if a prior unrelated edit reordered sections.

---

## File Structure

- **Modify:** `C:\Users\Wilson.Pinto\.agents\skills\bootstrap\SKILL.md` (source of truth, edited first)
- **Modify (sync, byte-identical copy):** `C:\Users\Wilson.Pinto\.copilot\skills\bootstrap\SKILL.md`
- **Modify (sync, byte-identical copy):** `c:\Users\Wilson.Pinto\DevSetup\AgentSetup\agents-skills\bootstrap\SKILL.md`

---

### Task 1: Generalize frontmatter, Purpose, and Inputs tables [x] DONE

**Files:**
- Modify: `C:\Users\Wilson.Pinto\.agents\skills\bootstrap\SKILL.md`

**Does NOT cover:** the dashboard JS hour constants (Task 2) or the Execution Steps confirmation sub-step (Task 2) — this task is markdown prose/table edits only.

- [ ] **Step 1: Re-read the source file to confirm it matches the design-time snapshot**

Run: read `C:\Users\Wilson.Pinto\.agents\skills\bootstrap\SKILL.md` and confirm line 4 still reads `BLOCKING REQUIREMENT — the phrase "bootstrap superpowers"` and line 9 still contains `PSM NG projects`.
Expected: both strings present, confirming the file hasn't changed since design.

- [ ] **Step 2: Edit frontmatter description**

Old:
```
  BLOCKING REQUIREMENT — the phrase "bootstrap superpowers" (anywhere in a message, including
  as a trailing line after a feature description) is a HARD trigger for this skill. Do NOT skip
  it even if the request looks small, even if complexity classification elsewhere would call it
  MICRO/LIGHTWEIGHT, and even if the same message also contains implementation instructions —
  this skill's scaffolding + approval gate ALWAYS runs first, no exceptions. Scaffold feature
  documentation structure for PSM NG projects. Creates Plan/, Estimation_Progress/, Feature/
  folders with templated files (design spec, implementation plan, progress tracker, README).
```
New:
```
  BLOCKING REQUIREMENT — the phrase "bootstrap superpowers" (anywhere in a message, including
  as a trailing line after a feature description) is a HARD trigger for this skill. Do NOT skip
  it even if the request looks small, even if complexity classification elsewhere would call it
  MICRO/LIGHTWEIGHT, and even if the same message also contains implementation instructions —
  this skill's scaffolding + approval gate ALWAYS runs first, no exceptions. Scaffold feature
  documentation structure for any project. Creates Plan/, Estimation_Progress/, Feature/
  folders with templated files (design spec, implementation plan, progress tracker, README).
```

- [ ] **Step 3: Edit Purpose section**

Old:
```
Auto-generate the standard feature documentation skeleton used across PSM NG projects. Produces a consistent, ready-to-fill structure that matches the established template (reference: `Docs/Features/PSM_NG_Import_Risks_From_Project_Plan/`).
```
New:
```
Auto-generate a standard feature documentation skeleton for any project. Produces a consistent, ready-to-fill structure: design spec, phased implementation plan, and a progress tracker with pace metrics.
```

- [ ] **Step 4: Rewrite Required Inputs table (rename APP_NAME → PROJECT_NAME as an auto-detected optional input, not required)**

Old:
```
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
```
New:
```
## Required Inputs

Gather these before scaffolding (ask user if not provided):

| Input | Description | Example |
|---|---|---|
| `FEATURE_NAME` | Short feature identifier | "Add CSV Export" |
| `TARGET_DIR` | Where to create the structure | `Docs/Features/CsvExport` |
| `DESCRIPTION` | One-line summary | "Add CSV export button to the reports screen" |
| `DATE` | ISO date (default: today) | `2026-07-13` |

## Optional Inputs

| Input | Description | Default |
|---|---|---|
| `TASKS` | List of tasks with estimates | Empty (fill later) |
| `PROJECT_NAME` | Project/app name | Auto-detected (see below), confirmed with user before use |
| `ENVIRONMENT` | Target environment | `(not specified)` if not provided |
| `STATUS` | Initial status | "📋 Proposal — awaiting PM approval" |
| `WORK_SCHEDULE` | Daily work window + lunch break | `Mon-Fri, 09:00-18:00, 1h lunch (13:00-14:00) -> 8h/day` |

**`PROJECT_NAME` auto-detection** (first match wins, always shown to the user for confirmation before any file is written — never silently trusted):
1. `name` field from `package.json` at repo root, if present.
2. `name` field from `pyproject.toml` at repo root, if present.
3. Repo root folder name.
4. Ask the user.
```

- [ ] **Step 5: Verify Step 2-4 edits applied**

Run: grep for `PSM NG` and `Project Status Review App` in `C:\Users\Wilson.Pinto\.agents\skills\bootstrap\SKILL.md`
Expected: 0 matches for `Project Status Review App`; `PSM NG` may still appear later in the file (template headers, handled in Task 2) — this step only confirms Steps 2-4's specific edits landed, not the whole file.

- [ ] **Step 6: Commit is deferred to Task 4** (all three edited files are committed together at the end)

---

### Task 2: Generalize template headers, dashboard JS constants, and add new Rules [x] DONE

**Files:**
- Modify: `C:\Users\Wilson.Pinto\.agents\skills\bootstrap\SKILL.md`

**Does NOT cover:** re-deriving the Gantt backward-walk algorithm — only the four numeric literals inside it change, the surrounding loop/comments stay byte-identical.

- [ ] **Step 1: Edit the three template headers + README App line**

Old (design doc header):
```
# PSM NG - {FEATURE_NAME} — Design
```
New:
```
# {PROJECT_NAME} — {FEATURE_NAME} — Design
```

Old (plan header):
```
# PSM NG - {FEATURE_NAME} — Implementation Plan
```
New:
```
# {PROJECT_NAME} — {FEATURE_NAME} — Implementation Plan
```

Old (progress header):
```
# PSM NG — {FEATURE_NAME} — Progress
```
New:
```
# {PROJECT_NAME} — {FEATURE_NAME} — Progress
```

Old (README Context block):
```
## Context

- **App**: {APP_NAME}
- **Environment**: {ENVIRONMENT}
- **Date**: {DATE}
- **Status**: {STATUS}
```
New:
```
## Context

- **Project**: {PROJECT_NAME}
- **Environment**: {ENVIRONMENT}
- **Date**: {DATE}
- **Status**: {STATUS}
```

- [ ] **Step 2: Edit the design template's own header line (inside the fenced code block for `Plan/{DATE}-{slug}-design.md`)**

Old:
```
# PSM NG - {FEATURE_NAME} — Design

## Context

- Environment: {ENVIRONMENT}
- App: {APP_NAME}
- Date: {DATE}
```
New:
```
# {PROJECT_NAME} — {FEATURE_NAME} — Design

## Context

- Environment: {ENVIRONMENT}
- Project: {PROJECT_NAME}
- Date: {DATE}
```

- [ ] **Step 3: Edit the plan template's own header line**

Old:
```
# PSM NG - {FEATURE_NAME} — Implementation Plan
```
New:
```
# {PROJECT_NAME} — {FEATURE_NAME} — Implementation Plan
```
(This is the second occurrence of this exact string — the first was edited in Step 1 as the outer README's Documents-table reference target; this one is the template's own top line. Use the surrounding `Design reference: [{DATE}-{slug}-design.md]({DATE}-{slug}-design.md)` line on the next line down to disambiguate which occurrence to edit if the tool requires unique matching.)

- [ ] **Step 4: Edit the progress template's own header line**

Old:
```
# PSM NG — {FEATURE_NAME} — Progress
```
New:
```
# {PROJECT_NAME} — {FEATURE_NAME} — Progress
```

- [ ] **Step 5: Parameterize the dashboard JS hour constants — `isWorkMinute()`**

Old:
```javascript
    function isWorkMinute(date) {
      const day = date.getDay(); // 0 = Sun, 6 = Sat
      if (day === 0 || day === 6) return false;
      const h = date.getHours() + date.getMinutes() / 60;
      if (h < 9 || h >= 18) return false;
      if (h >= 13 && h < 14) return false; // lunch
      return true;
    }
```
New:
```javascript
    function isWorkMinute(date) {
      const day = date.getDay(); // 0 = Sun, 6 = Sat
      if (day === 0 || day === 6) return false;
      const h = date.getHours() + date.getMinutes() / 60;
      if (h < {WORK_START_HOUR} || h >= {WORK_END_HOUR}) return false;
      if (h >= {LUNCH_START_HOUR} && h < {LUNCH_END_HOUR}) return false; // lunch
      return true;
    }
```

- [ ] **Step 6: Parameterize `computeNonWorkingBreaks()`**

Old:
```javascript
        if (day === 0 || day === 6) {
          breaks.push({ from: dayMs, to: dayMs + 24 * 3600000 }); // whole weekend day
        } else {
          breaks.push({ from: dayMs, to: dayMs + 9 * 3600000 });                // 00:00-09:00
          breaks.push({ from: dayMs + 13 * 3600000, to: dayMs + 14 * 3600000 }); // 13:00-14:00 lunch
          breaks.push({ from: dayMs + 18 * 3600000, to: dayMs + 24 * 3600000 }); // 18:00-24:00
        }
```
New:
```javascript
        if (day === 0 || day === 6) {
          breaks.push({ from: dayMs, to: dayMs + 24 * 3600000 }); // whole weekend day
        } else {
          breaks.push({ from: dayMs, to: dayMs + {WORK_START_HOUR} * 3600000 });                // 00:00-{WORK_START_HOUR}:00
          breaks.push({ from: dayMs + {LUNCH_START_HOUR} * 3600000, to: dayMs + {LUNCH_END_HOUR} * 3600000 }); // lunch
          breaks.push({ from: dayMs + {WORK_END_HOUR} * 3600000, to: dayMs + 24 * 3600000 });   // {WORK_END_HOUR}:00-24:00
        }
```

- [ ] **Step 7: Update the Work Schedule prose block (in `Estimation_Progress/progress.md` template) to reference the variable instead of the fixed text**

Old:
```
**Work Schedule** (fixed constant, applies to every feature — not configurable per-feature unless the user says otherwise):
- Monday–Friday, 09:00–18:00, with a 1h lunch break built in → 8h effective capacity per full business day.
- No capacity counted on weekends or outside this window.
```
New:
```
**Work Schedule** ({WORK_SCHEDULE}, applies to this feature — override at scaffold time via the `WORK_SCHEDULE` input, default shown):
- Monday–Friday, {WORK_START_HOUR}:00–{WORK_END_HOUR}:00, with a {LUNCH_END_HOUR_MINUS_LUNCH_START_HOUR}h lunch break built in.
- No capacity counted on weekends or outside this window.
```

- [ ] **Step 8: Append two new Rules to the numbered Rules list (after existing Rule 11)**

Old (end of Rules list):
```
11. **Emoji-safe editing**: progress.md is full of non-BMP emoji (🚀/🟢/🟡/🔴 in Pace Light, ✅/⏳ in Status) stored as UTF-16 surrogate pairs. When updating a row/cell that contains one, always replace the **entire row or cell** in a single oldString/newString pair — never a partial substring splice that could land mid-emoji, since a cut inside a surrogate pair silently corrupts it into a lone invalid surrogate (renders as �).
```
New:
```
11. **Emoji-safe editing**: progress.md is full of non-BMP emoji (🚀/🟢/🟡/🔴 in Pace Light, ✅/⏳ in Status) stored as UTF-16 surrogate pairs. When updating a row/cell that contains one, always replace the **entire row or cell** in a single oldString/newString pair — never a partial substring splice that could land mid-emoji, since a cut inside a surrogate pair silently corrupts it into a lone invalid surrogate (renders as �).
12. **`PROJECT_NAME` is auto-detected but always confirmed.** Before scaffolding, show the detected value (source: package.json / pyproject.toml / folder name) and ask the user to confirm or override it — never write files using an unconfirmed guess.
13. **`WORK_SCHEDULE` default is Mon-Fri 09:00-18:00 with a 1h lunch (13:00-14:00), 8h/day.** If the user specifies a different schedule, substitute it into both the prose (Rules/Efficiency Metric sections) and the four dashboard JS hour constants (`{WORK_START_HOUR}`, `{WORK_END_HOUR}`, `{LUNCH_START_HOUR}`, `{LUNCH_END_HOUR}`) — keep both in sync, never update one without the other. If the user's schedule description can't be parsed into four numeric hour values, fall back to the default and note in the generated README that the schedule couldn't be parsed.
```

- [ ] **Step 9: Add confirmation sub-step to Execution Steps**

Old:
```
1. Collect/confirm required inputs (ask if missing)
2. Generate slug from FEATURE_NAME
3. Create folders: `{TARGET_DIR}/Plan/`, `{TARGET_DIR}/Estimation_Progress/`, `{TARGET_DIR}/Feature/`
```
New:
```
1. Collect/confirm required inputs (ask if missing)
1a. Auto-detect PROJECT_NAME (package.json → pyproject.toml → repo folder name) and show it to the user for confirmation or override before proceeding — never write files using an unconfirmed guess.
2. Generate slug from FEATURE_NAME
3. Create folders: `{TARGET_DIR}/Plan/`, `{TARGET_DIR}/Estimation_Progress/`, `{TARGET_DIR}/Feature/`
```

- [ ] **Step 10: Verify no PSM-NG strings remain**

Run: `grep -in "PSM NG\|Project Status Review App\|MyApp-DEV\|PSM_NG_Import_Risks" "C:\Users\Wilson.Pinto\.agents\skills\bootstrap\SKILL.md"`
Expected: no matches (exit code 1 / empty output).

- [ ] **Step 11: Verify the Gantt algorithm body is otherwise untouched**

Run: `grep -n "remainingMinutes--\|cursor.getTime() - 60000\|while (remainingMinutes > 0)" "C:\Users\Wilson.Pinto\.agents\skills\bootstrap\SKILL.md"`
Expected: all three lines still present and unchanged — confirms Step 5 only touched the two `if` condition literals, not the surrounding `subtractWorkHours()` loop.

---

### Task 3: Manual scaffold smoke test [x] DONE

**Files:**
- Create (scratch, deleted after): a throwaway feature folder under this DevSetup repo, outside any tracked `Docs/` convention.

**Does NOT cover:** testing the dashboard generation trigger (requires all tasks marked Done first, out of scope for a scaffold-only smoke test).

- [ ] **Step 1: Invoke the skill to scaffold a test feature**

Run (in a fresh Copilot CLI session, or by manually following the skill's own Execution Steps as Claude Code): scaffold a feature named "Smoke Test Feature" into `C:\Users\WILSON~1.PIN\AppData\Local\Temp\claude\c--Users-Wilson-Pinto-DevSetup\318ae88f-88ea-409f-b87c-2eaf9190043b\scratchpad\bootstrap-smoke-test\Docs\Features\SmokeTest`, letting `PROJECT_NAME` auto-detect from this repo.
Expected: skill reports a detected `PROJECT_NAME` (likely "DevSetup", from the repo folder name, since there's no root `package.json`/`pyproject.toml`) and asks for confirmation before writing.

- [ ] **Step 2: Confirm generated files contain no PSM-NG strings and use the detected name**

Run: `grep -rin "PSM NG\|Project Status Review App" "C:\Users\WILSON~1.PIN\AppData\Local\Temp\claude\c--Users-Wilson-Pinto-DevSetup\318ae88f-88ea-409f-b87c-2eaf9190043b\scratchpad\bootstrap-smoke-test"`
Expected: no matches. README.md and the design doc's header should read `# DevSetup — Smoke Test Feature — ...` (or whatever `PROJECT_NAME` was confirmed as).

- [ ] **Step 3: Clean up the scratch test**

Run: `Remove-Item -Recurse -Force "C:\Users\WILSON~1.PIN\AppData\Local\Temp\claude\c--Users-Wilson-Pinto-DevSetup\318ae88f-88ea-409f-b87c-2eaf9190043b\scratchpad\bootstrap-smoke-test"`
Expected: directory removed, no trace left in the repo (it was never under `DevSetup\`, so nothing to `git status` check here).

---

### Task 4: Sync mirrors, verify, and commit [x] DONE

**Files:**
- Modify: `C:\Users\Wilson.Pinto\.copilot\skills\bootstrap\SKILL.md`
- Modify: `c:\Users\Wilson.Pinto\DevSetup\AgentSetup\agents-skills\bootstrap\SKILL.md`

- [ ] **Step 1: Copy the edited source file to both mirrors**

Run:
```powershell
Copy-Item "C:\Users\Wilson.Pinto\.agents\skills\bootstrap\SKILL.md" "C:\Users\Wilson.Pinto\.copilot\skills\bootstrap\SKILL.md" -Force
Copy-Item "C:\Users\Wilson.Pinto\.agents\skills\bootstrap\SKILL.md" "c:\Users\Wilson.Pinto\DevSetup\AgentSetup\agents-skills\bootstrap\SKILL.md" -Force
```
Expected: both commands complete with no error.

- [ ] **Step 2: Verify all three copies are byte-identical**

Run:
```powershell
(Get-FileHash "C:\Users\Wilson.Pinto\.agents\skills\bootstrap\SKILL.md").Hash
(Get-FileHash "C:\Users\Wilson.Pinto\.copilot\skills\bootstrap\SKILL.md").Hash
(Get-FileHash "c:\Users\Wilson.Pinto\DevSetup\AgentSetup\agents-skills\bootstrap\SKILL.md").Hash
```
Expected: all three hashes identical.

- [ ] **Step 3: git status and diff review**

Run: `git status` and `git diff -- AgentSetup/agents-skills/bootstrap/SKILL.md` (in `c:\Users\Wilson.Pinto\DevSetup`)
Expected: only `AgentSetup/agents-skills/bootstrap/SKILL.md` shows as modified (the two live copies outside DevSetup aren't git-tracked); diff shows only the changes from Tasks 1-2, nothing unexpected.

- [ ] **Step 4: Commit**

```bash
git add AgentSetup/agents-skills/bootstrap/SKILL.md
git commit -m "$(cat <<'EOF'
Generalize bootstrap skill: drop PSM-NG-specific naming/defaults

Renames APP_NAME to PROJECT_NAME with auto-detection (package.json /
pyproject.toml / folder name, always confirmed before use), removes
hardcoded PSM NG references and the single reference-project example,
and makes the dashboard's work-hour constants overridable via a new
WORK_SCHEDULE input instead of a fixed Mon-Fri 9-18 assumption. Pace
tracking and Gantt backward-walk logic unchanged.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers spec sections 1-2 (frontmatter/Purpose/Inputs); Task 2 covers sections 3-5 (template headers, dashboard JS, new Rules) plus the Execution Steps interface change; Task 3 covers the spec's Testing Strategy manual-verification bullet; Task 4 covers the spec's Rollout Notes (mirror sync) and Testing Strategy's re-sync check. No spec section left uncovered.
- **Placeholder scan:** all old/new blocks are the actual file content (verified against the full file read during design), no "TBD"/"similar to above" shortcuts.
- **Type/name consistency:** `APP_NAME` → `PROJECT_NAME` renamed consistently across Task 1 (tables) and Task 2 (headers, README, design/plan template headers) — no leftover `APP_NAME` reference. `{WORK_START_HOUR}`/`{WORK_END_HOUR}`/`{LUNCH_START_HOUR}`/`{LUNCH_END_HOUR}` used identically in Step 5, 6, and 7 of Task 2.
