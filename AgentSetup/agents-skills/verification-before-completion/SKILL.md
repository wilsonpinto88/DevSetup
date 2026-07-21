---
name: verification-before-completion
description: >
  MANDATORY before declaring any task "done", "fixed", "complete", or "ready". Prevents
  false completion claims by requiring actual evidence (test run, manual check, file
  read confirming the change) rather than assumption. Triggers at the end of any
  LIGHTWEIGHT or FULL task, before the final response to the user.
---

# Verification Before Completion

## Core Rule

Never say "this should work now" or "done" without having actually verified it. If you
haven't run it, tested it, or re-read the result, say what you *haven't* verified rather
than implying full confidence.

## Process

1. **Identify what "done" means for this specific task** — a passing test? A file
   existing with correct content? A specific behavior observed? Be concrete before checking.
2. **Gather evidence**:
   - Ran the test suite / specific test → paste or summarize the actual result.
   - Read the file back after editing → confirm the change is actually there and correct
     (edits can silently fail to apply or apply to the wrong location).
   - Checked for compile/lint errors (`get_errors`) after non-trivial code changes.
3. **Self-consistency check for ambiguous claims**: if you're not fully sure the evidence
   proves completion, consider it from a second angle before asserting "verified" — e.g.
   "the test passed" is strong evidence; "the code looks correct" is weak evidence and
   should be labeled as such, not stated as confirmed.
4. **Report honestly**:
   - If verified: state what you checked and the result.
   - If partially verified: say exactly what's confirmed and what isn't yet.
   - If you could not verify (no test infra, can't run the app, etc.): say so explicitly
     and suggest how the user can verify.

## Anti-patterns

- "Should be fixed now" with no test run, no re-read, no evidence.
- Treating "the code compiles" as equivalent to "the feature works correctly."
- Silently skipping verification because it's inconvenient, then claiming completion anyway.
