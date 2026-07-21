---
mode: 'agent'
description: 'Verify completion claims with fresh evidence before saying done. Run before "tests pass", "ready to merge", "bug is fixed", or any equivalent claim.'
---

# Verification Before Completion

Do not claim success without fresh command evidence.

## Gate

Before any completion claim:

1. Identify the exact command that proves the claim
2. Run it now — do not use cached output or prior session results
3. Inspect exit code AND output
4. State results exactly as observed
5. **If the change includes a condition or gate: explicitly state what it does NOT cover. If that gap should be covered — fix it before declaring done.**

## Applies To (no exceptions)

- "Tests pass"
- "Bug is fixed"
- "Build succeeds"
- "Ready to merge"
- "Feature is complete"
- Any equivalent wording

## Not Acceptable As Evidence

- "Should pass" — run it
- "Looks good" — prove it
- Output from a previous run — re-run it
- Subagent reports without independent verification — verify yourself

## Minimum Evidence By Type

| Claim | Required evidence |
|---|---|
| Tests pass | Command output showing zero failures |
| Build succeeds | Exit code 0 + no error output |
| Bug is fixed | Reproduction case now passes |
| Feature complete | Explicit checklist against plan requirements |

## Regression Test Verification (Red-Green Cycle)

For bugfixes with regression tests — the test must prove it catches the bug:

```
1. Write test → Run → PASS (test exists but bug not fixed yet)
   ← this alone proves nothing

Correct cycle:
1. Write test → Run → FAIL (bug still present) ← proves test detects the bug
2. Fix bug → Run → PASS ← proves fix works
```

A regression test never seen failing proves nothing.

## Self-Consistency Check (for complex verification)

If the evidence is ambiguous or the verification requires multi-step reasoning:
1. Generate 3 independent interpretations of the evidence
2. If 2+ agree: use that conclusion
3. If all differ: gather more evidence — don't guess
