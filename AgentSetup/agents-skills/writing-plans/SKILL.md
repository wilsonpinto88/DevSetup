---
name: writing-plans
description: >
  Use when planning any non-trivial coding task (FULL complexity per using-copilot-superpowers).
  Produces a structured, phased implementation plan before any code is written. Triggers on
  "plan this", "write a plan for", "how would you implement", or automatically when routed
  here from using-copilot-superpowers for new features/bugs.
---

# Writing Plans

## When to Use

Any FULL-complexity task: new feature, non-trivial refactor, cross-module change, or
anything where jumping straight to code risks rework.

## Process

1. **Restate the goal** in one sentence — confirms shared understanding before planning.
2. **Investigate first** — read the relevant files (semantic_search / grep_search / read_file)
   before proposing anything. Never plan against assumed code you haven't verified.
3. **Draft the plan** as phases, each phase = one coherent unit of work:
   - Phase name
   - Files/areas touched
   - Tasks (1h minimum each — group small ones)
   - Verification step for that phase (how you'll know it's done right)
4. **Flag unknowns** explicitly — don't silently assume. List them as "Open questions"
   if anything is ambiguous, and ask rather than guess on anything that changes behavior.
5. **Present the plan, then stop.** Do not start implementing until the user confirms —
   unless they've already said "implement" as part of the same request (see
   `using-copilot-superpowers` entry sequence).

## Anti-patterns (avoid)

- Planning in vague prose instead of concrete phases/tasks.
- Skipping investigation and planning against guessed file contents.
- Padding the plan with speculative future-proofing not asked for (YAGNI).
- Silently expanding scope beyond what was requested.

## Output Format

Prefer a markdown table or numbered phase list — matches the convention already used in
this workspace's `bootstrap` skill output (Plan/*.md files use the same phase/task/estimate
table shape). Reuse that shape for consistency when the target is a PSM NG feature; use a
lighter ad-hoc version for general coding tasks with no doc-scaffolding requirement.
