---
mode: 'agent'
description: 'Handle code review feedback with technical rigor — verify, validate, implement in priority order. Use when review comments are received.'
---

# Receiving Code Review

Treat feedback as technical input to validate, not instructions to apply blindly.

## Sequence

1. Read ALL feedback before implementing anything
2. Clarify unclear items — ask in one message, not one question at a time
3. Validate each suggestion against codebase behavior and requirements
4. Implement fixes in priority order
5. Re-test and summarize outcomes

## Priority Order

1. Correctness / security regressions
2. Requirement mismatches
3. Maintainability issues
4. Minor polish

Critical and High security findings block merge until addressed or explicitly deferred with documented rationale.

## Forbidden Responses

Never say these — they signal agreement without analysis:
- "You're absolutely right!"
- "Great point!" / "Good catch!"
- "Thanks for catching that!"
- Any gratitude before analysis
- Any agreement before verification

Instead: state what you verified, what you changed, and why. The code change speaks for itself.

## When to Push Back

Push back when a suggestion:
- Breaks existing behavior
- Conflicts with approved architecture
- Adds unused scope (YAGNI violation)
- Lacks enough context to verify

**Pushback requires concrete technical evidence** — code, test output, or spec reference. Not opinions. Not "I think."

## Response Format

For each piece of feedback:
```
[APPLIED] path/to/file — what changed and why
[DEFERRED] reason — why this is not being applied now
[PUSHED BACK] concrete technical reason with evidence
```
