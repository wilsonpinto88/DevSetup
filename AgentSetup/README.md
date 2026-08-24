# AI Agent Environment -- Setup & Portability Guide

## Overview

This system ensures your AI agent configuration (skills, hooks, plugins, settings) is:
- **Portable** -- survives disk format, machine swap
- **Project-agnostic** -- not tied to any single workspace
- **One-command restore** -- single script gets you back to full capability

**Note:** This is restore-only. There's no export script in this repo -- if you change a skill, prompt, or instruction locally, update the matching file under `AgentSetup\` by hand and commit it. Keeps the repo simple and avoids re-baking machine-specific config into it by accident.

---

## Architecture

```
GLOBAL (machine-level -- applies to ALL projects/workspaces)
======
Live locations (where VS Code / Claude / Copilot reads from):
  %USERPROFILE%\.agents\skills\         28 skills -- Copilot CLI's global skill path (confirmed live via session.skills_loaded), NOT read by Claude Code
  %USERPROFILE%\.copilot\skills\        Mirror of the same 28 skills -- VS Code Copilot CHAT's documented global "personal skills" path (distinct from .agents\skills\, which Chat does NOT read). Both are restored from the SAME source (agents-skills\) -- see step 8 in the restore script.
  %USERPROFILE%\.claude\CLAUDE.MD       Claude Code instructions (workflow routing, TDD, security, etc.)
  %USERPROFILE%\.claude\settings.json   Env vars, enabled plugins, model config, real hooks (SessionStart, statusLine)
  %USERPROFILE%\.claude\skills\         Additional Claude-only skills
  %USERPROFILE%\.claude\plugins\        Installed plugins (cloned from git)
  %APPDATA%\Code\User\prompts\          Copilot slash-commands (.prompt.md) -- mirrors .agents/skills
  %APPDATA%\Code\User\settings.json     Copilot instructions (codeGeneration.instructions), tool auto-approve, otel

Backup (tracked in this git repo -- survives format, portable to any machine):
  DevSetup\
    AgentSetup\
      agents-skills\<28 skill folders>\SKILL.md    Single source of truth -- restored to BOTH .agents\skills\ (Copilot CLI) and .copilot\skills\ (VS Code Copilot Chat)
      claude\CLAUDE.MD
      claude\settings.json
      claude\skills\explore-codebase.md
      copilot\prompts\<25 *.prompt.md files>
      copilot\settings.copilot.json      Filtered Copilot-relevant keys only (no machine-specific plugin-cache paths, no org-identifying keys)
      copilot\copilot-cli-instructions.md  Personal instructions for GitHub Copilot CLI (~/.copilot/copilot-instructions.md)
      copilot\copilot-cli-settings.json  Copilot CLI's own settings (default model, etc.) -- ~/.copilot/settings.json
      copilot\hooks\dangerous-command-guard.json   Repo-schema hook def (preToolUse, matcher: shell) -- ~/.copilot/hooks/
      copilot\hooks\scripts\dangerous-command-guard.ps1 / .sh   Actual guard logic the hook shells out to
    Scripts\
      04-Restore-Agent-Skills.ps1        This repo's AgentSetup\ --> new machine (one-way; update AgentSetup\ by hand when you change something locally)


PER-PROJECT (workspace-scoped -- stays inside each project)
===========
  /memories/repo/project-map.md          Project structure & conventions
  /memories/repo/state.md                Current task snapshot
  /memories/repo/known-issues.md         Gotchas for this specific project
  Docs/.../Plan/                         Feature design & implementation plans
  Docs/.../Estimation_Progress/          Progress trackers
```

**Note (updated 2026-07-28):** Copilot CLI *does* now have real hooks (`preToolUse`, `postToolUse`, `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preCompact`, `subagentStart`/`Stop`, `notification`, etc.), loaded from policy/repo/user/plugin sources and merged. This repo ships two:
- **`~/.copilot/hooks/dangerous-command-guard.json`** (user-level, applies everywhere) -- fires on `preToolUse` for the `shell` tool and can hard-deny (`permissionDecision: "deny"`, exit 2) destructive commands (`rm -rf`, `git reset --hard`, `git push --force`, `Remove-Item -Recurse -Force`, `mkfs`, `dd if=`, format), the same category the old "Dangerous command awareness" instruction only asked nicely about.
- **`.github/hooks/context-mode.json`** (repo-level, DevSetup only) -- wires the `context-mode` plugin's native VS Code Copilot integration (`sessionStart`/`preToolUse`/`postToolUse`/`preCompact`) into this repo, giving Copilot the same context-window-protection sandboxing (`ctx_execute`, `ctx_search`) that Claude Code already has via the plugin. Requires `.vscode/mcp.json` (also in this repo) pointing at the globally-installed `context-mode` command, and `npm install -g context-mode`. **This is per-project** -- copy both files into any other repo where you want it active.

VS Code's Copilot chat instructions (`codeGeneration.instructions`, `.prompt.md`) are still soft -- read by the model, not enforced in code.
**Windows requirements:**
- The CLI shells out to `pwsh` (PowerShell 7+) specifically for the `powershell` hook key, not `powershell.exe` 5.1. If `pwsh` isn't on PATH, a matched hook crashes and the CLI **fails closed** (denies), which for a broad matcher like `^shell$` means every shell command gets blocked. Install via `winget install --id Microsoft.PowerShell` before hooks go live.
- `context-mode`'s CLI needs **Node 20.12+** (`node:util`'s `styleText` export) -- on 20.11.x it fails to even start. This machine runs Node 24.16.0 via `nvm` for that reason; `nvm use 24.16.0` before reinstalling/upgrading `context-mode` globally.
- `context-mode`'s `better-sqlite3` dependency is a native module with no prebuilt binary published for this Node build; a plain `npm install -g context-mode` fails at `node-gyp rebuild` without Visual Studio's C++ build tools installed. Workaround used here: `npm install -g context-mode --ignore-scripts`, then copy the matching prebuilt `.node` binary from the already-working Claude plugin copy (`~/.claude/plugins/cache/context-mode/context-mode/<version>/node_modules/better-sqlite3/build/Release/better_sqlite3.abi<NNN>.node` → target's `build/Release/better_sqlite3.node`; ABI 115 = Node 20, ABI 137 = Node 24). Fragile across `context-mode` version bumps -- if `context-mode doctor` reports the native module broken after an upgrade, redo this copy step, or install the VS Build Tools "Desktop development with C++" workload for a real fix.

---

## Scripts

### 04-Restore-Agent-Skills.ps1

**Purpose**: Restores the full agent environment on a new/formatted machine, or shares your setup with someone else.

**When to run**: After cloning this repo, once VS Code + Git are installed.

**What it does**:

| Step | Source (repo) | Destination (local) |
|------|-------------------|---------------------|
| 1 | `DevSetup\AgentSetup\agents-skills\*` | `%USERPROFILE%\.agents\skills\` |
| 2 | `DevSetup\AgentSetup\claude\CLAUDE.MD` | `%USERPROFILE%\.claude\CLAUDE.MD` |
| 3 | `DevSetup\AgentSetup\claude\settings.json` | `%USERPROFILE%\.claude\settings.json` |
| 4 | `DevSetup\AgentSetup\claude\skills\*` | `%USERPROFILE%\.claude\skills\` |
| 5 | Git repos (internet) | `%USERPROFILE%\.claude\plugins\marketplaces\` |
| 6 | `DevSetup\AgentSetup\copilot\prompts\*` | `%APPDATA%\Code\User\prompts\` |
| 6 | `DevSetup\AgentSetup\copilot\settings.copilot.json` | merged into `%APPDATA%\Code\User\settings.json` (existing keys preserved, Copilot keys overwritten) |
| 7 | `DevSetup\AgentSetup\copilot\copilot-cli-instructions.md` | `%USERPROFILE%\.copilot\copilot-instructions.md` (used once GitHub Copilot CLI is installed) |
| 8 | `DevSetup\AgentSetup\agents-skills\*` (same source as step 1) | `%USERPROFILE%\.copilot\skills\` -- VS Code Copilot Chat's global skill path, distinct from step 1's `.agents\skills\` |
| 9 | `DevSetup\AgentSetup\copilot\copilot-cli-settings.json` | merged into `%USERPROFILE%\.copilot\settings.json` (default model, etc.) |
| 10 | `DevSetup\AgentSetup\copilot\hooks\*` | `%USERPROFILE%\.copilot\hooks\` (requires `pwsh` on PATH -- see note below) |

**Plugins cloned from git**:
- `caveman` -- https://github.com/JuliusBrussee/caveman.git
- `context-mode` -- https://github.com/mksglu/context-mode.git
- `superpowers-optimized` -- https://github.com/REPOZY/superpowers-optimized.git

**After restore, you need to**:
- Re-authenticate (credentials not backed up)
- Open VS Code -- skills are auto-detected from `.agents/skills/`

**Keeping AgentSetup\ up to date**: no export script exists on purpose. When you add/edit a skill, prompt, or instruction, manually copy the changed file(s) into the matching path under `AgentSetup\` and commit. Keeps the repo free of machine-specific noise (auto-approve regexes, plugin cache paths, org-specific config) that an automated export would otherwise pick up.

---

## What Each Component Does

### Skills (.agents/skills/) -- 28 total, Copilot-only

**Confirmed by live audit (2026-07-15):** `.agents/skills/` is NOT read by Claude Code. Claude Code loads its skills exclusively from 3 installed plugins (`~/.claude/plugins/cache/{caveman,context-mode,superpowers-optimized}/`), totaling 37 skills across those plugins. The two skill sets have similar *names and purposes* (parallel reimplementations) but are physically separate files with separate origins -- editing one does not affect the other.

**Parity note (2026-07-28):** Skill count was 18 vs Claude's 37 -- 10 auto-triggering skills were missing (existed only as manual `/slash` prompts, or not at all). Added: `deliberation`, `dependency-management`, `finishing-a-development-branch`, `frontend-design`, `performance-investigation`, `refactoring`, `self-consistency-reasoner`, `subagent-driven-development`, `using-git-worktrees`, `claude-md-creator`. Still not mirrored: the `caveman-help`, `ctx-*` (context-mode), and `caveman-commit`/`caveman-review` reference-card skills -- those exist only as `.prompt.md` slash commands, not auto-triggering skills. See "Known gaps" below for `context-mode`, the largest remaining one.

| Skill | Trigger | What it does |
|-------|---------|---------------|
| `bootstrap` | "bootstrap superpowers", "scaffold feature", "/bootstrap" | Creates Plan/, Estimation_Progress/, Feature/ folders with templated specs |
| `caveman` | "caveman mode", auto-triggers per CLAUDE.MD | Token-efficient communication (~75% reduction) |
| `find-skills` | "find a skill for X", "is there a skill..." | Discovers installable skills from marketplace |
| `using-copilot-superpowers` | any coding task | Router: classifies micro/lightweight/full, dispatches to the right skill |
| `writing-plans`, `executing-plans` | "plan this", implementing a plan | Phased implementation with verification gates |
| `test-driven-development` | any behavior change | Enforces red-green-refactor |
| `systematic-debugging` | "debug", "why is this failing" | Evidence-first root-cause diagnosis |
| `requesting-code-review`, `receiving-code-review`, `red-team` | review/feedback on code | Structured self-review + OWASP checklist, adversarial testing |
| `premise-check` | ambiguous/assumption-laden requests | Validates assumption before implementing |
| `brainstorming` | unclear/multi-option problems | Structured design discussion before planning |
| `deliberation` | complex/unclear decisions, "should we use X or Y" | Stakeholder-perspective deliberation before brainstorming |
| `context-management` | "map this project" | Builds `/memories/repo/project-map.md` |
| `error-recovery` | bug fixed, gotcha found | Persists to `/memories/repo/known-issues.md` |
| `dispatching-parallel-agents` | broad multi-part research | Governs use of Explore subagent |
| `subagent-driven-development` | executing a plan with independent tasks | Parallel subagent execution with staged review gates |
| `using-git-worktrees` | "isolate this work", risky changes | Isolated branch workspace setup |
| `finishing-a-development-branch` | verified work, "merge this"/"create a PR" | Merge / PR / keep / discard decision + execution |
| `dependency-management` | "update dependencies", CVEs, breaking changes | Incremental, verified dependency upgrades |
| `refactoring` | "refactor", "restructure", "extract into" | Behavior-locked structural changes |
| `performance-investigation` | "slow", "optimize", "why is this slow" | Measure-first profiling/fix/re-measure loop |
| `frontend-design` | any UI/frontend work | Production-grade visual quality + a11y standards |
| `claude-md-creator` | "/init", "create copilot-instructions.md" | Minimal, high-signal repo context files |
| `self-consistency-reasoner` | invoked internally by debugging/verification | Multi-path reasoning + majority vote for high-stakes inference |
| `token-efficiency`, `verification-before-completion` | every session / before "done" | Tool-call discipline, no false completion claims |
| `graph-map` | "map this project", "build a graph/architecture map" | Builds a Graphify project map (symbols, relationships, communities, HTML graph); falls back to `graph-map-fabasoft.py` for Fabasoft `.ducx-*` DSL files |

### Copilot layer (VS Code User prompts + settings) -- mirrors the skills above

| Component | Location | What it does |
|-----------|----------|---------------|
| `*.prompt.md` (22 files) | `%APPDATA%\Code\User\prompts\` | Slash-command equivalents of the Claude skills (TDD, debugging, planning, review, frontend-design, claude-md-creator, subagent-driven-development, etc.) |
| `codeGeneration.instructions` | `%APPDATA%\Code\User\settings.json` | 8 always-on rule blocks mirroring CLAUDE.MD (caveman, routing, TDD, security, tool-efficiency, session-start, secrets, dangerous-command awareness) |

**Known limitation:** the VS Code Copilot chat layer (`codeGeneration.instructions`, `.prompt.md`) is soft -- model reads and should follow, never hard-enforced. Copilot CLI is different: it has real hooks (see `dangerous-command-guard.json` above) that can hard-deny tool calls, same category as Claude Code's `PreToolUse` blocking.

### Known gaps (Copilot vs Claude Code, as of 2026-07-28)

- **Plugins:** Claude has 3 installed (`caveman`, `context-mode`, `superpowers-optimized`). Copilot CLI's own plugin system (`copilot plugin install <source>`) is unused -- `copilot plugin list` reports none installed. No 1:1 equivalent plugin exists to port; revisit if/when one does.
- **Reference-card / meta skills:** `caveman-help`, `ctx-doctor`, `ctx-index`, `ctx-insight`, `ctx-purge`, `ctx-search`, `ctx-stats`, `ctx-upgrade` exist for Claude (via the `caveman` and `context-mode` plugins) but have no Copilot equivalent, auto-triggering or otherwise. Lower priority -- these are diagnostic/utility commands, not workflow skills.
- **`context-mode` is wired for DevSetup only.** Its `.vscode/mcp.json` + `.github/hooks/context-mode.json` pair (see above) needs copying into each additional repo where the context-window-protection sandboxing should apply -- it isn't a machine-global fix like the skill/hook work above.

### CLAUDE.MD (hooks & rules)

| Hook | What it enforces |
|------|------------------|
| Caveman auto-start | Loads caveman mode at session start |
| Workflow routing | Classifies tasks: micro/lightweight/full |
| TDD enforcement | No production code before failing test |
| Security gate | OWASP check on auth/crypto/secrets changes |
| Tool efficiency | Batch parallel calls, no redundant reads |
| Secret protection | Never hardcode credentials |

### settings.json

| Setting | Value | Purpose |
|---------|-------|---------|
| `MAX_THINKING_TOKENS` | 128000 | Extended reasoning |
| `ENABLE_TOOL_SEARCH` | true | Deferred tool loading |
| `enabledPlugins` | caveman, context-mode, superpowers-optimized | Active plugins |
| `model` | sonnet | Default model |

---

## Per-Project vs Global -- Decision Guide

| Type of thing | Scope | Where it lives |
|---------------|-------|----------------|
| Skills (SKILL.md files) | Global | `.agents/skills/` (backed up to DevSetup) |
| CLAUDE.MD, settings | Global | `.claude/` (backed up to DevSetup) |
| Plugins | Global | `.claude/plugins/` (cloned from git) |
| Copilot prompts + instructions | Global | `%APPDATA%\Code\User\` (backed up to `DevSetup\AgentSetup\copilot\`) |
| Project map, state | Per-project | `/memories/repo/` |
| Feature plans, progress | Per-project | Inside project's `Docs/` folder |
| Session logs | Per-session | `/memories/session/` (ephemeral) |

---

## Full Machine Setup Sequence

Steps 2–4 are optional and reflect the repo owner's personal app/tool lists (`winget-packages.json`, `vscode-extensions.txt`, `dotnet-tools.txt`, etc.) -- edit those files to your own tools first, or skip straight to step 5, which is the only step that isn't personal/optional.

After a fresh Windows install:

```powershell
# 1. Clone the repo (works anywhere -- git clone https://github.com/wilsonpinto88/DevSetup.git)
cd DevSetup\Scripts

# 2. (Optional, personal) Restore apps via winget -- skips anything already installed
.\01-Install-Core-Apps.ps1          # as Administrator

# 3. (Optional, personal) Restore VS Code extensions
.\02-Restore-VSCode-Extensions.ps1

# 4. (Optional, personal) Install everything else (.NET tools, Node, npm)
.\03-Install-All.ps1

# 5. Restore AI agent environment (skills, hooks, plugins, Copilot prompts/instructions) -- works the same for anyone
.\04-Restore-Agent-Skills.ps1

# 6. Open VS Code, start new chat, say "bootstrap superpowers" -- works.
```

---

## Maintenance

| Action | Command |
|--------|---------|
| After modifying a skill, prompt, or instruction | Manually copy the changed file into `AgentSetup\`, then `git add -A; git commit; git push` |
| On new machine, or sharing with someone | `.\04-Restore-Agent-Skills.ps1` |
| After adding new plugin | Add its git URL to restore script's `$plugins` array, then commit |
