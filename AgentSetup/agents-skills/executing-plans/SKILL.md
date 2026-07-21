---
name: executing-plans
description: >
  Use when implementing a previously-written plan (from writing-plans or a feature's
  Plan/*.md docs). Enforces disciplined, phase-by-phase execution with verification
  between phases rather than a single big-bang implementation.
---

# Executing Plans

## Core Rule

Execute one phase at a time. Verify each phase before moving to the next. Never batch
multiple phases into one unverified sweep — errors compound and become harder to isolate.

## Process

1. **Re-read the plan** immediately before starting (don't rely on memory of it from
   earlier in the conversation if significant time/turns have passed).
2. **Per phase**:
   - Implement only that phase's tasks.
   - Run the phase's verification step (test, lint, manual check — whatever applies).
   - If verification fails, fix before proceeding — don't stack phase 2 on a broken phase 1.
   - Update the feature's `progress.md` if one exists (mark tasks done, recompute metrics).
3. **TDD applies within each phase** — see `test-driven-development`: failing test before
   the code that makes it pass, for any phase that adds/changes behavior.
4. **On completion of all phases**, invoke `verification-before-completion` before
   declaring the work done.

## Deviating from the Plan

If reality contradicts the plan mid-execution (API doesn't work as assumed, file doesn't
exist, etc.), stop and tell the user what changed and how you propose to adapt — don't
silently improvise a different approach and continue as if the plan still holds.

## Anti-patterns

- Implementing all phases then testing once at the end.
- Marking tasks "done" in progress trackers without actually verifying them.
- Silently dropping a task from the plan because it turned out inconvenient.
