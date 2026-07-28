---
name: refactoring
description: >
  MUST USE when restructuring existing code without changing behavior:
  extracting functions/modules, inlining, simplifying, decoupling, reorganizing
  files, renaming across the codebase, or cleaning up code structure. Enforces
  behavior-locking tests before any structural change and incremental
  verification after each move. Distinct from brainstorming (designs new
  behavior) and bug fixing (changes behavior). Triggers on "refactor",
  "restructure", "reorganize", "clean up this code", "extract into", "inline
  this", "simplify", "decouple", "modularize", "split this module", "consolidate".
---

# Refactoring

Change structure without changing behavior. Prove it at every step.

## Why

"Just moving things around" is exactly why refactoring is dangerous without a
behavior lock — structural changes silently break contracts, reorder side
effects, drop edge cases.

## Phase 1 — Behavior lock

1. Run the existing test suite (detect the runner from `package.json`,
   `Makefile`, `pytest.ini`, `Cargo.toml`, etc.). All must pass first — if not,
   that's `systematic-debugging`, not refactoring.
2. Identify the refactoring surface — which functions/modules/files change.
3. For each item on that surface: does a test exercise its public behavior? If
   yes, that's the lock. If no, write a characterization test — asserts current
   behavior (not "correct" behavior), just enough to catch unintended drift. For
   side effects, spy/mock and assert on call args. Too coupled to unit-test →
   note it as a refactoring driver, test at the integration boundary instead.
4. Confirm all green — this is the baseline.

## Phase 2 — Scope definition

State explicitly: what changes (extract X, move Y→Z, inline W, rename A→B) and
what must NOT change (concrete — "the HTTP response shape stays identical").
Boundary check each move: does it cross a module boundary, change an import path
others depend on, or touch serialization/wire format? Any "yes" → that part isn't
a refactor, split it out to `brainstorming` → `writing-plans`.

## Phase 3 — Incremental steps

One structural change at a time:
1. Make exactly one move (extract, rename, inline, split — pick one).
2. Run the test suite (full suite before moving to Phase 4; scoped subset okay
   mid-flight if it's slow).
3. Test breaks → the move changed behavior. Don't edit the test to match —
   revert, investigate, either fix the move to preserve behavior or acknowledge
   it's a real behavior change and route through TDD.
4. Verify green before the next move. Never batch "extract and rename and move"
   into one step.

## Phase 4 — Completion gate

Full suite green, no skips · characterization tests from Phase 1 still pass
identically · for each renamed/moved symbol, separate searches for: direct
calls/type refs, string literals (config keys, error messages), dynamic
imports/`require()`, re-exports/barrel files, test files/mocks, docs/comments —
one search cannot prove absence · 5+ files or cross-module touch → suggest
`requesting-code-review` for circular-dependency/layering checks a test suite
won't catch.

## Rules

- A refactoring that changes behavior isn't a refactoring — route it as a
  feature/bug fix instead.
- Never weaken a test to make a refactor pass — the test is the lock.
- Found a bug mid-refactor? Note it, finish the refactor, fix the bug separately
  via TDD.
- Scope grows past Phase 2's definition → stop and re-scope before continuing.

## Related Skills

`test-driven-development` (coverage gaps found) · `systematic-debugging`
(pre-refactor tests already failing) · `brainstorming`→`writing-plans` (turns out
behavior must change) · `verification-before-completion` (final gate)
