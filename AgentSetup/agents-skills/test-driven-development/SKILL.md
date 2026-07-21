---
name: test-driven-development
description: >
  MANDATORY for any code change that adds or modifies behavior. Enforces red-green-refactor:
  failing test written and confirmed failing BEFORE production code, minimum code to pass,
  confirm pass, then refactor. Never acceptable to write code first, skip tests "because
  it's simple", or write tests after the fact.
---

# Test-Driven Development

## The Cycle (non-negotiable for FULL and LIGHTWEIGHT tasks)

1. **Write a failing test** that expresses the desired behavior.
2. **Run it — confirm it fails for the expected reason** (not a typo, not a missing import;
   the actual assertion should be what fails). If it fails for the wrong reason, fix the
   test setup first.
3. **Write the minimum code** to make that test pass. Resist adding anything not required
   by the current failing test (YAGNI).
4. **Run it — confirm it passes.**
5. **Refactor** if needed (clean up naming, remove duplication) with the test staying green
   throughout.
6. Repeat for the next behavior increment.

## Never Acceptable

- Writing production code before a failing test exists for it.
- Skipping tests because "this is simple" or "obviously correct."
- Writing the test after the code, then claiming TDD was followed.
- Assuming the type system or a code review substitutes for a test.
- Batching multiple behaviors into one test-then-code cycle instead of incrementing.

## Exceptions

- MICRO tasks (per `using-copilot-superpowers` classification) are exempt — a typo fix
  doesn't need a test cycle.
- Pure documentation, config-only, or markdown-only changes are exempt (nothing executable
  to test).
- If the workspace genuinely has no test infrastructure and setting one up is out of scope
  for the current task, say so explicitly and ask the user how they want to proceed —
  don't silently skip and don't silently set up a whole test framework unasked.

## Verification Language

When reporting a change, be explicit: "Wrote failing test for X (confirmed failed on
[reason]), implemented, test now passes." Vague claims like "should work now" are not
acceptable completion language — see `verification-before-completion`.
