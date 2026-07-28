---
name: claude-md-creator
description: >
  Creates minimal, high-signal context files (AGENTS.md, .github/copilot-instructions.md,
  CLAUDE.md) based on empirical best practices. Invoke on "/init", "create
  copilot-instructions.md", "create AGENTS.md", "update CLAUDE.md", "set up
  Copilot for this project". Also invoked by brainstorming when a repo lacks a
  context file.
---

# Agent Context File Creator

Creates repo-level context files that give a coding agent the minimum guidance
needed to work correctly — for whichever file this environment/repo uses
(`AGENTS.md`, `.github/copilot-instructions.md`, `CLAUDE.md`).

**Core principle: only include what the agent cannot easily discover itself.**

Empirical research (Gloaguen et al., 2026, "Evaluating AGENTS.md") found
LLM-generated context files *decrease* agent performance ~3% and increase cost
20-23% when padded with redundant/broad content — while human-written, minimal
files improve performance ~4%. Signal density is the whole game.

## Trigger conditions

`/init`, user asks to create/update a context file, "agent context",
"initialize project", "set up Copilot" — or the repo lacks one when
`brainstorming`/`writing-plans` starts.

## What to include (highest to lowest impact)

1. **Build/test/lint commands** — the single highest-impact instruction type;
   explicit tool mentions get used 1.6-2.5x more. Spell out exact commands
   (`npm run test -- --watch`, `uv run pytest tests/ -x`, `make lint && make typecheck`).
2. **Non-obvious environment setup** — env vars, required services, secrets
   handling, DB setup the agent would otherwise get wrong.
3. **Critical constraints** — narrow, only things that break if violated:
   "never edit `generated/`, it's overwritten by codegen"; "migrations go through
   the ORM, never raw SQL"; "`legacy/` is CommonJS, no ES imports."
4. **Repo-specific patterns** that differ from standard practice. If any
   experienced developer would do it by default, leave it out.

## What to exclude (empirically zero-benefit or harmful)

- Repository overviews / project descriptions — agents explore the repo
  regardless of whether an overview exists; it just adds tokens.
- Directory trees / file structure listings — agents navigate by searching, not
  by reading maps.
- Architecture summaries — skip the explanation, keep only a constraint if
  violating it causes incorrect behavior (e.g. "monorepo — changes to
  `packages/core` require rebuilding all dependents").
- Content duplicating README/docs/wiki/comments — removing such duplication in
  the study improved performance 2.7%, proving redundancy was the problem.
- Generic best practices ("write tests", "use meaningful names") — already known.
- Over-constraining rules — every added rule costs reasoning tokens and risks
  over-application; include only what breaks the repo if violated.

## Process

1. Scan the repo: key config (`package.json`, `tsconfig.json`, `Makefile`, CI
   configs), source structure.
2. Identify gaps — what would an agent get wrong without explicit guidance?
   Focus on commands, env setup, breakage-causing constraints.
3. Ask only what can't be inferred from the repo.
4. Draft short and high-signal — aim under ~50 lines. Every line must pass:
   *"would the agent produce wrong output without this?"*
5. Self-assess before presenting: for every line, *"is this discoverable by
   reading code/types/comments?"* Yes or unsure → cut it. This filtering is your
   job, not the user's.
6. Present the draft for human review — unreviewed LLM-generated context files
   consistently underperform. State briefly why each surviving section earns its
   place. Ask only what the codebase itself can't answer (undocumented team
   conventions, production-only gotchas, decisions made outside the repo).
