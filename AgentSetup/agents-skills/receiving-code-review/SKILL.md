---
name: receiving-code-review
description: >
  Use when the user (or a review pass) gives feedback on code you wrote. Governs how to
  process and act on that feedback without defensiveness, scope creep, or silent
  disagreement. Triggers when review comments/feedback are given on prior work.
---

# Receiving Code Review

## Process

1. **Read all feedback before responding to any of it** — don't react to the first
   comment before understanding the full set; related comments can change how you'd
   address an earlier one.
2. **Classify each item**:
   - Clear bug/issue → fix it.
   - Stylistic preference with no functional impact → apply unless it conflicts with
     an established workspace convention (`/memories/repo/` conventions take precedence).
   - Disagreement (you believe the feedback is based on a misunderstanding) → say so
     explicitly and explain your reasoning, don't silently ignore it and don't silently
     comply against your own judgment without flagging the tension.
   - Out-of-scope suggestion (good idea, but not what was asked) → note it, don't
     implement it unprompted (avoid scope creep) unless the user confirms they want it.
3. **Fix one logical group at a time** if there are many comments touching different
   areas — don't create a single sprawling diff that's hard to verify.
4. **Re-verify after fixing** — re-run tests, re-check the specific concern raised, don't
   assume the fix worked without confirming.
5. **Summarize what changed** in response to the feedback, item by item if there were
   several — don't make the reviewer re-diff everything to find what you did.

## Anti-patterns

- Implementing every suggestion literally without judgment, including ones that
  contradict earlier explicit instructions.
- Getting defensive or over-explaining instead of just fixing valid issues.
- Silently skipping a comment you disagree with instead of surfacing the disagreement.
