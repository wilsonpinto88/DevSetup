---
name: performance-investigation
description: >
  MUST USE when investigating or fixing performance issues: slow responses, high
  memory usage, CPU spikes, throughput degradation, or optimization requests.
  Enforces measure-first methodology — profile before guessing, baseline before
  fixing, re-measure after every change. Distinct from systematic-debugging
  (changes behavior to fix bugs) and brainstorming (designs new features).
  Triggers on "slow", "performance", "optimize", "speed up", "latency",
  "throughput", "memory leak", "high CPU", "profiling", "benchmark",
  "bottleneck", "takes too long", "why is this slow", "make it faster".
---

# Performance Investigation

Measure first. Guess never. Fix once.

## Why

Performance intuition is wrong more often than right — the wrong function gets
optimized, the wrong query gets cached. Measurement-first ensures you fix what's
actually slow.

## Phase 1 — Baseline

1. Define the metric precisely: "GET /api/users p95 under 100 concurrent" not
   "it's slow."
2. Measure current state 3+ times (or 2 runs within 5% for long measurements).
   Record value, method, environment.
3. Set a target if the user hasn't — prevents infinite optimization.
   ```
   Baseline: GET /api/users → 1200ms p95 (100 concurrent, 10k rows)
   Target: < 300ms p95
   Method: wrk -t4 -c100 -d30s http://localhost:3000/api/users
   ```

## Phase 2 — Profile

1. Use a CLI/text-output profiler where possible (readable directly): Node
   `--prof`/`--prof-process`, Python `cProfile`/`py-spy top`, Go `pprof -text`,
   SQL `EXPLAIN ANALYZE`, `perf stat`. For GUI-only tools (Lighthouse UI, DevTools),
   ask the user to run and share output.
2. Profile under realistic data size and concurrency — 10 rows tells you nothing
   about 10M rows. No profiler available → add lightweight timing
   (`console.time`/`Date.now()` deltas) at suspected boundaries.
3. Identify the top consumers by **self time**, not call count or apparent
   Big-O — the bottleneck is what actually costs wall-clock time.
4. State the bottleneck explicitly before proposing any fix.

## Phase 3 — Hypothesize

1. State a specific fix with a predicted improvement ("batch N+1 queries into one
   IN query → ~80% reduction, 1200ms → ~300ms").
2. Sanity-check: does it target the measured bottleneck? Is the prediction
   realistic? Does it change behavior (→ route through TDD)?
3. Name the risk (memory spikes, cache staleness, added complexity).

## Phase 4 — Fix and re-measure

1. One change at a time — never bundle optimizations, or you can't attribute
   the improvement.
2. Re-measure with the exact same method as Phase 1.
3. Target met → stop, document. Improved but short → back to Phase 2, bottleneck
   likely shifted. No improvement → hypothesis was wrong, revert, re-profile.
   Regression → revert immediately, investigate.
4. Record: fix, before, after, % improvement, target status.

## Rules

- Never optimize without a measurement.
- Never optimize code that isn't the measured bottleneck — a function at 2% of
  total time can't produce a meaningful win regardless of effort.
- One fix at a time.
- Behavior-changing fix (response shape, error handling) → route through TDD, it's
  not "just" an optimization.
- Stop when the target is met.

## Anti-patterns

"Cache everything" (staleness bugs, memory pressure — only cache what profiling
says is slow) · "Parallelize it" (only helps CPU-bound work; makes I/O/lock
contention worse) · "It's O(n²), must fix" (constant factor dominates at small n
— profile first) · pre-optimizing before any measurement exists.

## Related Skills

`systematic-debugging` (degradation is actually a bug) · `test-driven-development`
(fix requires behavior change) · `refactoring` (fix is purely structural)
