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

## Test Quality Rules

Passing tests only matter if they can fail for the right reason. Apply to every test written.

1. **Avoid mocks whenever possible.** Prefer real implementations, in-memory fakes, or real
   local services. Mock only true external boundaries you cannot run (paid third-party APIs,
   clock, randomness). Never mock the unit under test or code you own just to isolate it.
2. **Use Testcontainers for integration tests.** Need a DB, queue, cache, or broker? Run the
   real one in a throwaway container instead of mocking the client or using a different engine.
   If the language has no Testcontainers port, use docker compose with a disposable instance.
3. **Couple tests to public APIs, not code structure.** Call exported functions, HTTP routes,
   CLI commands, or UI. Do not assert on private methods, internal call order, or call counts.
   A pure refactor must never break a test.
4. **Reproduce a bug in a failing test before fixing it.** Bug report or defect found: write
   the test that fails because of the bug, confirm the failure matches the symptom, then fix.
   No fix without that regression test.
5. **Keep logic out of tests.** No loops, conditionals, or computing the expected value with
   the same algorithm as production. Use literal inputs and literal expected outputs. One
   behavior per test, readable top to bottom.
6. **Find missing tests with mutation and property-based testing.** For core logic, run a
   mutation tool (Stryker, mutmut, PIT, cargo-mutants) and kill surviving mutants by adding
   tests. Use property-based tests (fast-check, Hypothesis, jqwik, proptest) for parsers,
   serializers, math, and anything with invariants. Scope to changed code; skip if no tool
   fits, and say so.
7. **Test real user flows end to end.** For web UI changes, drive the real app with Playwright
   (use the Playwright MCP if available) instead of asserting on component internals.
8. **Assert behavior from the user's point of view.** Assert what a user or caller observes
   (output, response, rendered text, persisted result), named like a behavior:
   `rejects expired token`, not `calls validateToken`.

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
