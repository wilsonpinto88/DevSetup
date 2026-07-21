---
mode: 'agent'
description: 'Measure-first performance investigation. Use for slow responses, high memory, CPU spikes, throughput issues. Profile before guessing. Baseline before fixing.'
---

# Performance Investigation

Measure first. Guess never. Fix once.

## Phase 1: Baseline

Before changing anything, establish a quantitative baseline.

1. **Define the metric precisely** — "it's slow" is not a metric. "GET /api/users takes 1200ms p95 under 100 concurrent connections" is.
2. **Measure current state** — run 3+ times to confirm stability. Record: value with units, measurement method, environment.
3. **Set a target** — what does "fast enough" look like? Stops infinite optimization.

```
Baseline: GET /api/users → 1200ms p95 (100 concurrent, 10k rows)
Target: < 300ms p95
Method: wrk -t4 -c100 -d30s http://localhost:3000/api/users
```

## Phase 2: Profile

Find the ACTUAL bottleneck — not the guessed one.

Profiling tools by stack:
- Node.js: `node --prof` + `node --prof-process`
- Python: `python -m cProfile -s cumulative script.py`
- Go: `go test -bench . -cpuprofile cpu.prof` + `go tool pprof -text cpu.prof`
- .NET: `dotnet-trace collect` + `dotnet-trace report`
- Database: `EXPLAIN ANALYZE` on slow queries
- General: `time command`, add `console.time`/`Date.now()` at boundaries

**Profile under realistic conditions** — 10 rows tells you nothing about 10 million.

State the bottleneck explicitly before proposing any fix:
> "82% of time in `serializeUser()` — specifically the N+1 query loading permissions for each user."

## Phase 3: Hypothesize

Propose ONE fix with a predicted improvement:
> "Adding an index on `user_id` in the permissions table should reduce query time from 800ms to ~10ms."

State what you expect, then measure to confirm. Do not apply multiple fixes at once — you won't know which one worked.

## Phase 4: Fix and Re-Measure

1. Apply exactly one change
2. Re-run the baseline measurement with identical conditions
3. Compare: did it hit the target?
4. If yes: document and stop. If no: profile again — the bottleneck may have shifted.

## Anti-Patterns (Forbidden)

| Pattern | Why |
|---|---|
| "This looks inefficient, let me optimize it" | Profile first — intuition is wrong most of the time |
| Apply multiple optimizations at once | Can't tell which one helped |
| Measure on different data sizes or load | Comparing apples to oranges |
| Stop when it "feels faster" | Measure. Always. |
