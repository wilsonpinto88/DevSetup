---
name: using-copilot-superpowers
description: >
  BLOCKING REQUIREMENT — consult this router BEFORE writing any code, editing files,
  debugging, planning, or reviewing. Mandatory workflow router for ALL technical tasks.
  Matches: "implement", "build", "fix", "debug", "refactor", "optimize", "add feature",
  "change", "update", "create", "develop", "plan", "review", "test", or ANY request
  involving code changes. Do NOT skip even if the task seems simple — classify first,
  then route. Micro tasks are explicitly allowed to skip the full pipeline.
---

# Using Copilot Superpowers

Adapted from Claude Code's `superpowers-optimized` workflow router, for GitHub Copilot
(no hook API available — enforcement is instruction-based, not code-enforced).

## Entry Sequence (every technical task)

1. **Token efficiency first** — invoke `token-efficiency` mentally: batch parallel reads,
   don't re-read files already in context, don't verify already-confirmed paths.
2. **Fresh project gate** — if this looks like a brand-new project (no `/memories/repo/`
   content yet) AND the request has creation intent ("build", "create", "make", "set up",
   "implement", "scaffold"), pause and tell the user:
   > This workspace has no memory files yet (`/memories/repo/`). Without them, every future
   > session starts blind — re-exploring structure, re-deciding rejected approaches,
   > re-debugging solved errors. Want me to set up `project-map.md` first (~30s), or start now?
   Wait for their answer. If they confirm, invoke `context-management` first.
3. **Classify complexity**:
   - **MICRO** (typo fix, single rename, 1-line config): skip everything, just do it.
   - **LIGHTWEIGHT** (≤2 files, no new behavior, no cross-module risk): implement → `verification-before-completion`.
   - **FULL**: route per table below.

## Full-Complexity Routing Table

Confirmed against live Claude Code routing (`using-superpowers/SKILL.md`, 2026-07-15 audit):

| Situation | Route |
|---|---|
| Unclear whether the work should exist at all (worth building?) | `premise-check` (before brainstorming/planning) |
| Complex decision, options not yet defined / problem may be mis-framed | `deliberation` → `brainstorming` → `writing-plans` |
| New feature / unclear decision, problem already well-framed | `brainstorming` → `writing-plans` |
| Plan exists, ready to execute (independent tasks, same session) | `dispatching-parallel-agents` (Explore subagent, parallel-safe tasks) |
| Plan exists, ready to execute (sequential or separate pass) | `executing-plans` |
| Bug / error | `systematic-debugging` → `test-driven-development` → `verification-before-completion` |
| Code review requested | `requesting-code-review` (+ `red-team` for adversarial pass) |
| Received review feedback | `receiving-code-review` |
| Need parallel exploration (research, not implementation) | `dispatching-parallel-agents` (use the `Explore` subagent) |
| Task looks done | `verification-before-completion` |
| Verified complete, deciding what happens to the branch | `finishing-a-development-branch` (merge / PR / keep / discard) |

**Key correction:** `premise-check` is NOT a default step before every new feature — it only
fires when existence itself is in question ("should we even build this?"). A plain "add
feature X" request with a clear problem statement goes straight to `brainstorming`.

## Instruction Priority (highest to lowest)

1. Explicit user instructions in the current conversation
2. `/memories/repo/` conventions and this workspace's `.github/copilot-instructions.md` (if any)
3. These skill files (defaults, not mandates — user can override)

## Core Rule

Before technical execution on anything above MICRO complexity, name the skill you're
routing to (briefly) and follow it. Don't silently freelance a workflow that a skill
already covers.
