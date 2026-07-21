---
mode: 'agent'
description: 'RED-GREEN-REFACTOR cycle. Write failing tests before production code. No exceptions. Use for any behavior change or bug fix.'
---

# Test-Driven Development

Write failing tests first. Then write minimum code to pass.

## Iron Law

**No production code before a failing test proves the behavior is missing.**

If code was written first, delete it and restart from a test. No exceptions.

## Cycle

1. **RED**: Write one small failing test for one behavior
2. **VERIFY RED**: Run the test. Confirm it fails for expected reason (not syntax/import error)
3. **GREEN**: Write minimum production code to make the test pass. Nothing more.
4. **VERIFY GREEN**: Run target test and relevant broader tests. Confirm pass.
5. **REFACTOR**: Improve structure without changing behavior. Tests must stay green.

Repeat per behavior. Never skip VERIFY steps.

## Test Infrastructure Check

Before writing first test, verify project has a test runner:
- Check for: `jest.config.*`, `vitest.config.*`, `pytest.ini`, `pyproject.toml`, `go.mod`, `Cargo.toml`
- Check for test script: `npm test`, `yarn test`, `make test`
- If no runner exists: ask user before proceeding

## Right vs Wrong

**Wrong — code first:**
```
1. Write the handler function
2. Write tests to verify it works
3. All tests pass on first run ← tests prove nothing
```

**Right — test first:**
```
1. Write test: POST /users returns 201 with valid body
2. Run test → FAILS (handler doesn't exist) ← good
3. Write minimal handler
4. Run test → PASSES ← behavior was proven missing, now proven present
5. Refactor, tests stay green
```

## Rationalization Table

| Temptation | Why it fails |
|---|---|
| "Too simple to test" | Simple code has longest lifespan. Will be changed without knowing intent. |
| "I'll write tests after" | After never comes. Tests after pass immediately, prove nothing. |
| "Just refactoring" | Existing tests must stay green. Run them. |
| "Tests slow me down" | Debug sessions take 10x longer. |
| "Type system catches this" | Types catch shape errors, not logic errors. |
| "I need to see code shape first" | Spike in scratch file. Then delete it and TDD the real implementation. |

## Test Quality

- One behavior per test
- Behavior-oriented names: `test_expired_token_returns_401`
- Prefer real behavior checks over mock-only assertions
- Cover edge and error paths for changed behavior
