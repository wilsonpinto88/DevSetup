---
mode: 'agent'
description: 'Create minimal, high-signal AGENTS.md / copilot-instructions.md context files. Use for "create AGENTS.md", "set up repo instructions", "/init", or when a repo lacks agent context and brainstorming/planning needs one.'
---

# Agent Context File Creator

Creates repo-level context files (`AGENTS.md`, `.github/copilot-instructions.md`) with the minimum guidance an agent cannot discover itself.

**Core principle: only include what the agent cannot easily find on its own.** Empirical research shows LLM-generated context files that include redundant/broad content *decrease* agent performance ~3% and increase cost ~20%; minimal human-reviewed files improve performance ~4%.

## Include (highest to lowest impact)

1. **Exact build/test/lint commands** — spelled out verbatim (`npm run test -- --watch`, `pytest tests/ -x`). Explicit commands get used 1.6-2.5x more than vague mentions.
2. **Non-obvious environment setup** — env vars, required services, secrets handling.
3. **Critical constraints** — things that break if violated ("never edit `generated/`", "always use ORM, never raw SQL").
4. **Repo-specific patterns** that differ from standard practice only.

## Exclude (zero benefit or actively harmful)

- Repository overviews / project descriptions — agent explores anyway
- Directory trees / file structure listings — agent searches, doesn't read maps
- Architecture summaries — include the constraint only, skip the explanation
- Anything duplicating README/docs/wiki
- Generic best practices ("write tests", "use meaningful names")
- Over-constraining rules that don't prevent a real failure mode

## Process

1. Scan repo (package.json, tsconfig, Makefile, CI configs, source structure).
2. Identify gaps — what would the agent get wrong without being told?
3. Ask only what can't be inferred from the repo.
4. Draft under ~50 lines. Every line must pass: *"would the agent produce wrong output without this?"*
5. Self-filter before presenting: cut anything discoverable from code/types/comments.
6. Present for human review — explain briefly why each surviving section earned its place.
