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
  %USERPROFILE%\.agents\skills\         18 skills (bootstrap, caveman, TDD, systematic-debugging, etc. -- Copilot-only, NOT read by Claude Code)
  %USERPROFILE%\.claude\CLAUDE.MD       Claude Code instructions (workflow routing, TDD, security, etc.)
  %USERPROFILE%\.claude\settings.json   Env vars, enabled plugins, model config, real hooks (SessionStart, statusLine)
  %USERPROFILE%\.claude\skills\         Additional Claude-only skills
  %USERPROFILE%\.claude\plugins\        Installed plugins (cloned from git)
  %APPDATA%\Code\User\prompts\          Copilot slash-commands (.prompt.md) -- mirrors .agents/skills
  %APPDATA%\Code\User\settings.json     Copilot instructions (codeGeneration.instructions), tool auto-approve, otel

Backup (tracked in this git repo -- survives format, portable to any machine):
  DevSetup\
    AgentSetup\
      agents-skills\<18 skill folders>\SKILL.md    Also read by GitHub Copilot CLI (~/.agents/skills) once installed, per GitHub's docs -- not just VS Code
      claude\CLAUDE.MD
      claude\settings.json
      claude\skills\explore-codebase.md
      copilot\prompts\<22 *.prompt.md files>
      copilot\settings.copilot.json      Filtered Copilot-relevant keys only (no machine-specific plugin-cache paths, no org-identifying keys)
      copilot\copilot-cli-instructions.md  Personal instructions for GitHub Copilot CLI (~/.copilot/copilot-instructions.md)
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

**Note:** Claude Code has real event-driven hooks (`SessionStart`, `PreToolUse`, etc. in `settings.json`) that can programmatically block actions. Copilot has no hook mechanism -- `codeGeneration.instructions` and `.prompt.md` files are read by the model but nothing enforces them in code. Treat CLAUDE.MD/Copilot instructions as policy, not guaranteed enforcement.

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

### Skills (.agents/skills/) -- 18 total, Copilot-only

**Confirmed by live audit (2026-07-15):** `.agents/skills/` is NOT read by Claude Code. Claude Code loads its skills exclusively from 3 installed plugins (`~/.claude/plugins/cache/{caveman,context-mode,superpowers-optimized}/`). The two skill sets have similar *names and purposes* (parallel reimplementations) but are physically separate files with separate origins -- editing one does not affect the other.

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
| `context-management` | "map this project" | Builds `/memories/repo/project-map.md` |
| `error-recovery` | bug fixed, gotcha found | Persists to `/memories/repo/known-issues.md` |
| `dispatching-parallel-agents` | broad multi-part research | Governs use of Explore subagent |
| `token-efficiency`, `verification-before-completion` | every session / before "done" | Tool-call discipline, no false completion claims |

### Copilot layer (VS Code User prompts + settings) -- mirrors the skills above

| Component | Location | What it does |
|-----------|----------|---------------|
| `*.prompt.md` (22 files) | `%APPDATA%\Code\User\prompts\` | Slash-command equivalents of the Claude skills (TDD, debugging, planning, review, frontend-design, claude-md-creator, subagent-driven-development, etc.) |
| `codeGeneration.instructions` | `%APPDATA%\Code\User\settings.json` | 8 always-on rule blocks mirroring CLAUDE.MD (caveman, routing, TDD, security, tool-efficiency, session-start, secrets, dangerous-command awareness) |

**Known limitation:** Copilot has no hook mechanism. These are soft (model reads and should follow), never hard-enforced like Claude Code's `PreToolUse` hooks (which really do block dangerous Bash commands and secret-file reads in Claude Code, per live audit 2026-07-15).

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
