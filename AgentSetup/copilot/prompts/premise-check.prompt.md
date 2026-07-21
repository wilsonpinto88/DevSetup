---
mode: 'agent'
description: 'Validate whether proposed work should exist before investing in it. Use before designing, planning, or building anything non-trivial — or when new evidence arrives that could change the motivation.'
---

# Premise Check

Validate that the proposed work should exist before building it.

## Why

It's easy to treat a design request as unconditional — "user asked for X, so I'll design the best X." But the right answer is sometimes "X shouldn't exist." Without this check, effort flows into comprehensive designs that solve problems already handled, cost more than they're worth, or whose motivation evaporated with new evidence.

**The most dangerous failure mode: building something unnecessary with conviction.**

## When to Apply

- Before investing in any design, plan, or architecture proposal
- Before extending an existing system with significant new complexity
- When new evidence (test results, research, changed requirements) arrives related to in-progress work
- When you find yourself updating facts in a document without reassessing its conclusions

## The Three Questions

Answer honestly before proceeding:

**1. Does the problem actually exist, or is it already solved?**
Look at what's already in place. Check whether existing mechanisms cover the gap. If the problem was hypothetical when the work was proposed — has it since been confirmed or disproven?

**2. Is the proposed solution proportional to the problem?**
Compare complexity, maintenance burden, and cost against severity and frequency of the problem. A rare edge case doesn't justify a framework. Three lines of code don't need an abstraction.

**3. What's the cost of NOT building this?**
If the answer is "nothing breaks, things are just slightly less elegant" — that's a strong signal to skip it.

## What to Do With the Answers

- **All three pass** → proceed, but note why the work is justified
- **Any answer is unfavorable** → say so directly. Recommend against proceeding and explain why. Do NOT just note the concern and keep building — stop and surface the trade-off to the user
- **Evidence changed since work was proposed** → reassess the CONCLUSIONS, not just the facts. Updated facts with unchanged conclusions is the specific failure mode this check exists to catch
