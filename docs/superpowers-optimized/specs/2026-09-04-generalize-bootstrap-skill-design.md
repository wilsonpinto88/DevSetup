# Generalize `bootstrap` Skill -- Design

Date: 2026-09-04
Status: Approved

## Scope

Remove PSM-NG-specific naming and defaults from the `bootstrap` skill (`.agents/skills/bootstrap/SKILL.md`, mirrored to `.copilot/skills/bootstrap` and `AgentSetup/agents-skills/bootstrap`) so it works as a general "start any project" documentation-scaffolding skill, while keeping its existing mechanics unchanged: the `Plan/`/`Estimation_Progress/`/`Feature/` folder scaffold, the design/plan/progress templates, the pace-tracking Efficiency Metric + Daily Log, and the `dashboard.html` Highcharts generation.

## Non-goals

- Porting to Claude Code (`.claude/skills/bootstrap/`). Deferred to a future task -- this pass stays Copilot-only, same trigger mechanism (`using-copilot-superpowers` step 2's hard override on the literal phrase "bootstrap superpowers").
- Per-day-of-week schedule granularity (e.g. different hours on different weekdays). `WORK_SCHEDULE` stays one daily start/end + one lunch window, just parameterized instead of hardcoded.
- Retroactively rewriting already-scaffolded PSM NG feature docs. This only changes what future invocations generate.
- Multi-language/monorepo-aware project-name detection beyond a single fallback chain (see below). A monorepo with multiple sub-project names is out of scope for auto-detection nuance -- the user confirms or corrects the detected name either way.

## Approach

**In-place generalization** of the existing SKILL.md (not a rewrite). The pace-tracking formulas, emoji-safe editing rule, and Gantt backward-walk algorithm are already hardened against specific known bugs (documented inline with the bug scenarios they fix) -- a rewrite risks reintroducing them. Only the PSM-NG-specific strings, defaults, and the four hardcoded work-hour numeric literals in the dashboard JS change.

## Changes

### 1. Frontmatter + Purpose

- `description`: drop "for PSM NG projects" -- becomes "Scaffold feature documentation structure for any project."
- `## Purpose`: drop the PSM-NG wording and the `Docs/Features/PSM_NG_Import_Risks_From_Project_Plan/` reference line entirely (no replacement example -- the templates are self-contained).

### 2. Inputs -- rename APP_NAME to PROJECT_NAME, add auto-detection

| Input | Was | Becomes |
|---|---|---|
| `APP_NAME` | Optional, default `"Project Status Review App"` | Renamed `PROJECT_NAME`. Optional -- auto-detected via fallback chain (below), shown to the user for confirmation before use, never silently trusted. |
| `ENVIRONMENT` | Optional, default `"MyApp-DEV"` | Optional, no default -- if not provided, renders as `(not specified)` in templates. Only asked if the user wants environment tracking. |
| `WORK_SCHEDULE` | N/A (fixed constant) | New optional input. Default: `Mon-Fri, 09:00-18:00, 1h lunch (13:00-14:00) -> 8h/day`. Free-text description substituted into the Rules/Efficiency Metric prose *and* into four numeric constants used by the dashboard JS (start hour, end hour, lunch start, lunch end). |

**PROJECT_NAME auto-detection fallback chain** (first match wins, always shown to user for confirmation, never silently written into files):
1. `name` field from `package.json` at repo root (if present).
2. `name` field from `pyproject.toml` at repo root (if present).
3. Repo root folder name.
4. Ask the user.

### 3. Template header changes

Every template header that currently reads `# PSM NG - {FEATURE_NAME} -- ...` becomes `# {PROJECT_NAME} -- {FEATURE_NAME} -- ...` (three occurrences: design doc, implementation plan, progress tracker). README.md template's `**App**: {APP_NAME}` becomes `**App**: {PROJECT_NAME}`.

### 4. Dashboard JS parameterization

`isWorkMinute()`, `subtractWorkHours()`, and `computeNonWorkingBreaks()` currently hardcode `9`, `18`, `13`, `14` (start hour, end hour, lunch start, lunch end). These become template substitution variables (`{WORK_START_HOUR}`, `{WORK_END_HOUR}`, `{LUNCH_START_HOUR}`, `{LUNCH_END_HOUR}`) populated from `WORK_SCHEDULE`, defaulting to the same values as today when the user doesn't override the schedule. **Only the four numeric literals are substituted -- the surrounding backward-walk algorithm and its bug-fix commentary are untouched.**

### 5. New Rule (appended to the existing numbered Rules list)

> **PROJECT_NAME is auto-detected but always confirmed.** Before scaffolding, show the detected value (source: package.json / pyproject.toml / folder name) and ask the user to confirm or override it -- never write files using an unconfirmed guess.

> **WORK_SCHEDULE default is Mon-Fri 09:00-18:00 with a 1h lunch (13:00-14:00), 8h/day.** If the user specifies a different schedule, substitute it into both the prose (Rules/Efficiency Metric sections) and the four dashboard JS hour constants -- keep both in sync, never update one without the other.

## Interfaces / Contracts

No new files, no new commands -- this is a content edit to the existing `SKILL.md`'s frontmatter, Required/Optional Inputs tables, the three template header lines, the README template's App line, the Rules list, and the dashboard `<script>` block's three functions. The `Execution Steps` section gains one sub-step: "confirm auto-detected PROJECT_NAME with the user before proceeding to step 3 (create folders)."

## Error Handling

- No `package.json`/`pyproject.toml` and an unreadable/empty folder name (e.g. running from a drive root) -> fall through straight to asking the user; never leave `PROJECT_NAME` blank in a generated file.
- User provides a `WORK_SCHEDULE` string the skill can't parse into four numeric hour values (e.g. "flexible hours") -> fall back to the default (9/18/13/14) and note in the generated README that the schedule couldn't be parsed and the default was used, rather than guessing.

## Testing Strategy

- Manual verification: scaffold a throwaway feature folder in a non-PSM-NG repo (e.g. this DevSetup repo itself, in a scratch subfolder deleted after), confirm no "PSM NG" string appears anywhere in the generated output, confirm `PROJECT_NAME` is correctly auto-detected from this repo's context and confirmed before writing.
- Diff review: confirm the Gantt backward-walk algorithm's logic (loop structure, comments) is byte-identical except for the four substituted numeric literals -- this is the one place a careless edit could silently reintroduce the weekend/off-hours bug the existing comments describe fixing.
- Re-sync check: after editing, confirm the same content is copied to all three mirror locations (`.agents/skills/bootstrap`, `.copilot/skills/bootstrap`, `AgentSetup/agents-skills/bootstrap`) -- single source of truth per the existing repo convention.

## Rollout Notes

- No migration needed -- existing PSM NG feature docs already on disk are untouched; only future scaffolds use the generalized templates.
- Mirrored to `AgentSetup/agents-skills/bootstrap` so it survives the machine-restore script (04) without further changes there -- that script already copies the whole `agents-skills` folder recursively.
