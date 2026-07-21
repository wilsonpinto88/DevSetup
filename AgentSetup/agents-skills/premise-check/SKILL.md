---
name: premise-check
description: >
  Use before starting implementation on a request that contains an assumption which
  might be wrong (e.g. "fix the bug in X" when X might not be the actual cause, or
  "add caching to speed this up" when the bottleneck might be elsewhere). Prevents
  building the right solution to the wrong problem.
---

# Premise Check

## Core Rule

Before implementing a request that embeds a diagnosis or assumption, verify the
assumption is actually true — don't just accept the user's framing and build on top
of it if evidence suggests otherwise.

## Process

1. **Identify the embedded premise** — what is the request assuming is true? ("the
   bug is in the auth module", "the slow part is the database query", "this field is
   unused so it's safe to remove").
2. **Quick verification** — a short check (grep, read the relevant code, run the
   suspected slow query) before committing effort to the full request.
3. **If the premise holds**: proceed as requested, no need to belabor it.
4. **If the premise is wrong or incomplete**: say so before proceeding — "I checked X,
   and the actual issue looks like Y instead. Want me to address Y, or still do what
   you originally asked?" Don't silently redirect, and don't silently comply with a
   premise you've already disproven.

## When to Skip

MICRO tasks, or requests where the premise is clearly and trivially true (no ambiguity
to check). This is for cases where blindly trusting the premise risks real wasted effort.

## Anti-patterns

- Implementing a fix for a stated cause without a moment's check that the cause is real.
- Silently redirecting to what you think is the "real" problem without telling the user
  you did so.
- Over-applying this to obviously-correct simple requests, adding needless friction.
