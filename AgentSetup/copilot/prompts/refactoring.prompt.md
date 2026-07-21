---
mode: 'agent'
description: 'Restructure code without changing behavior. Lock behavior with tests first, then make one structural change at a time. Use for extraction, inlining, reorganizing, renaming.'
---

# Refactoring

Change structure without changing behavior. Prove it at every step.

## Iron Law

**No structural change before behavior is locked with tests. No merging tests with structural changes.**

If tests fail before you start: you are debugging, not refactoring. Switch to `#systematic-debugging`.

## Phase 1: Behavior Lock

1. Run existing test suite — all tests must pass
2. Identify the refactoring surface (which functions/files will change)
3. Audit test coverage on that surface:
   - Test exists for public API → verify it passes, use as behavior lock
   - No test exists → write a **characterization test** that captures current behavior (asserts actual output, not correct output — the goal is detecting unintended changes)
4. Confirm: all tests green. This is your baseline.

## Phase 2: Scope Definition

State explicitly before any code:

**What changes:** list the specific structural moves (extract function X, move file Y to Z, rename A to B)

**What stays the same:** list public APIs, contracts, and behaviors that must not change

**Boundary check:** for each move:
- Does it cross a module boundary? (higher risk)
- Does it change an import path other packages depend on? (requires coordinated update)
- Does it affect serialization or wire format? (not a refactor — that's a migration, needs `#brainstorming`)

## Phase 3: Incremental Steps

One structural change at a time. Full test suite green after each.

For each move:
1. Make exactly ONE structural change
2. Run full test suite
3. If a test breaks: the structural change altered behavior
   - Do NOT fix the test to match the new structure (that's removing the lock)
   - Revert the structural change and investigate why it changed behavior
4. If all green: commit this single change with a descriptive message

## Phase 4: Completion

After all moves complete:
- Run full test suite one final time
- Audit for stale references: imports, type annotations, string literals, mocks, comments
- Invoke `#verification-before-completion`
