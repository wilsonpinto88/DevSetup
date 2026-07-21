---
mode: 'agent'
description: 'Hypothesis-driven root cause analysis. No fix without evidence. Use when bug, test failure, error, or unexpected behavior appears.'
---

# Systematic Debugging

Do root-cause investigation before proposing fixes.

## Iron Law

**No fix without evidence for root cause.**

Every fix must trace back to a proven root cause. A fix without understanding why it works is a mask, not a fix.

## Phase 0: Check Known Issues

Search `known-issues.md` at project root for the error message or failing test name. If match found, try documented solution first. If it resolves, stop.

## Phase 1: Investigate

- Read full error output — not just last line
- Reproduce reliably. Cannot reproduce = cannot fix
- Check recent changes: `git log --oneline -10` and `git diff HEAD~1..HEAD --name-only`
- Add instrumentation at component boundaries
- For multi-component systems, log what enters and exits each boundary before proposing any fix
- Trace data/control flow backward from error to source

## Phase 2: Compare Patterns

- Find known-good implementation in repo that does something similar
- Compare: behavior, config, assumptions, environment
- List concrete differences — these are investigation leads

## Phase 3: Hypothesize (Self-Consistency)

Before committing to a hypothesis:

1. Generate 3-5 **independent** root cause hypotheses using different reasoning approaches
2. Reason each independently — don't let earlier hypotheses contaminate later ones
3. Take majority-vote diagnosis. Report confidence:
   - ≥3/5 agree → high confidence, proceed
   - 2/5 agree → medium, state uncertainty
   - All differ → stop. Gather more evidence before proposing a fix

**If confidence ≤50%: do not fix. Gather more evidence first.**

## Phase 4: Fix and Verify

- Apply fix only after Phase 3 gives a confident diagnosis
- Write a failing test that reproduces the bug **before** fixing (TDD)
- Fix the root cause, not the symptom
- Run full test suite after fix
- If fix doesn't work: discard hypothesis, return to Phase 1 with new evidence

## Anti-Patterns (Forbidden)

| Pattern | Why forbidden |
|---|---|
| Change something and see if it helps | This is guessing. It hides the real cause. |
| Fix the error message without finding why | Masks the bug. It will resurface. |
| "It's probably X" without checking | Confidence without evidence is noise. |
| Apply multiple changes at once | Can't tell which one fixed it. |
