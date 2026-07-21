---
name: systematic-debugging
description: >
  Use for any bug, error, or unexpected behavior investigation. Enforces evidence-first
  root-cause diagnosis using self-consistency (multiple independent hypotheses, majority
  vote) instead of committing to the first plausible-looking explanation. Triggers on
  "debug", "why is this failing", "fix this bug", "unexpected behavior", error messages.
---

# Systematic Debugging

## Why This Exists

A single reasoning chain can be confident but wrong — one arithmetic slip, one wrong
assumption, one misread stack trace, and the "fix" treats a symptom instead of the cause.
Generating multiple independent hypotheses and checking which the evidence actually
supports catches this before code changes are made on a false premise.

## Process

### Phase 1 — Gather Evidence
- Read the actual error message / stack trace in full — don't paraphrase from memory.
- Reproduce the exact conditions if possible (exact input, exact command).
- Read the relevant code path directly (`read_file` / `grep_search`) — don't guess at
  what a function does from its name.

### Phase 2 — Generate Multiple Hypotheses (self-consistency)
Before touching any code, generate 3-5 *independent* candidate root causes — genuinely
different angles (e.g. a data/input issue, a logic/off-by-one issue, a state/timing issue,
a dependency/environment issue, a misunderstanding of the API contract). Don't generate
5 variations of the same idea.

### Phase 3 — Evaluate & Vote
For each hypothesis, check it against the evidence gathered in Phase 1. Which hypotheses
does the evidence actually support? Take the majority.
- **High agreement** (most hypotheses point the same way): proceed to fix with confidence.
- **Low agreement** (≤50%, hypotheses scatter): **do not touch code yet** — gather more
  evidence (add logging, check a different file, ask the user for more context) until a
  clear signal emerges.

### Phase 4 — Fix with TDD
Once root cause is confident, write a failing test that reproduces the bug, then fix
per `test-driven-development`. Confirm the original symptom is gone AND no regression
was introduced.

### Phase 5 — Record
If this bug class could recur or was non-obvious, add a note to `/memories/repo/known-issues.md`
so future sessions don't rediscover it from scratch.

## Anti-patterns

- Jumping to a fix on the first plausible theory without checking alternatives.
- "It's probably X" without having read the code that would confirm/deny X.
- Fixing the symptom (e.g. adding a null check) without understanding why the null
  occurred in the first place.
