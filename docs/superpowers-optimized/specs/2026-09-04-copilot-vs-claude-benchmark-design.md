# Copilot CLI vs Claude Code Benchmark -- Design

Date: 2026-09-04
Status: Approved

## Scope

Build a small, repeatable benchmark that runs an identical set of tasks through GitHub Copilot CLI and Claude Code, both pinned to model `claude-sonnet-5`, against a shared synthetic sample project. Produces a comparison report covering: instruction-following, output correctness, planning, brainstorming, graph-map, test generation, code review, code quality, context management, and efficiency (time/tool-calls/tokens/cache).

## Non-goals

- Normalizing token accounting into one shared unit across vendors. Claude reports raw input/output/cache tokens; Copilot reports AI-credit-equivalent (`totalNanoAiu`) plus a token breakdown. Both are extracted and shown side by side, not converted into a single "currency."
- Testing any model other than `claude-sonnet-5`.
- Building an automated judge for subjective dimensions. Subjective scoring is a rubric filled in by the agent running the benchmark (Claude Code), explicitly flagged as self-assessed since Claude is one of the two subjects under test.
- Guarding against every possible session-log schema change in either CLI. The runner fails loudly (reports "metrics unavailable" for that run) rather than silently substituting zero when expected fields are missing.
- Multi-repo / multi-language coverage. One sample project (TypeScript) is enough signal for this pass; broader coverage is a future extension, not part of this spec.

## Architecture

```
Benchmarks/copilot-vs-claude/
  sample-project/            # small Express+TS API, git-tracked, reset between runs
    src/
    package.json
    .gitignore                # node_modules excluded from reset/clean
  tasks/
    tasks.json                 # task definitions (see Interfaces)
  run-benchmark.ps1           # driver script
  lib/
    reset-sample-project.ps1  # scoped git checkout + clean for sample-project/
    invoke-claude.ps1         # wraps `claude -p ...`, captures transcript + timing
    invoke-copilot.ps1        # wraps `copilot -p ... --model claude-sonnet-5`, same
    extract-claude-metrics.ps1   # parses --output-format stream-json result
    extract-copilot-metrics.ps1  # parses ~/.copilot/session-state/<id>/events.jsonl
  results/
    <run-timestamp>/
      <task-id>/
        claude/   transcript.txt, metrics.json, artifacts/ (changed files)
        copilot/  transcript.txt, metrics.json, artifacts/ (changed files)
      report.md                # generated comparison report for this run
```

Data flow per (task x agent):
1. Reset `sample-project/` to clean committed state.
2. Invoke the CLI non-interactively with the task prompt, `--model claude-sonnet-5`, and (Claude) `--output-format stream-json` / (Copilot) `--allow-all-tools`.
3. Record wall-clock time (`Measure-Command`), stdout transcript, exit code.
4. Copy any changed/created files under `sample-project/` into `results/<run>/<task>/<agent>/artifacts/` before the next reset destroys them.
5. Locate and parse the corresponding session log for token/cache/tool-call metrics.
6. Run the task's objective check (if any) against the artifacts; record pass/fail.
7. After all (task x agent) pairs complete, generate `report.md`: objective results table, rubric table (subjective tasks), efficiency table (time/tokens/cache/tool-calls, totals).

## Interfaces / Contracts

**`tasks.json`** -- array of task objects:
```json
{
  "id": "graph-map-organic",
  "dimension": "graph-map",
  "mode": "single-shot",            // or "multi-turn"
  "prompt": "...",
  "variant_of": "graph-map",         // groups organic/explicit pairs for routing-fairness comparison
  "objective_check": "check-graph-map.ps1",  // optional; omitted = subjective-only
  "notes": "tests organic skill routing, not execution quality"
}
```
Multi-turn tasks carry a `turns: string[]` array instead of a single `prompt`, executed via session resume (`claude --resume <id> -p "..."`, `copilot --resume=<id> -p "..."`).

**`invoke-*.ps1`** contract: given a task prompt/turns and a working directory, return `{ transcriptPath, exitCode, wallClockMs, sessionId }`. Never throws on a non-zero agent exit -- that's a task result (possible failure to complete), not a runner bug.

**`extract-*-metrics.ps1`** contract: given a `sessionId`, return `{ inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, toolCallCount, estCost, raw }` or `{ error: "metrics unavailable: <reason>" }` -- never a silently-zeroed object.

**Objective check scripts**: exit 0 = pass, exit 1 = fail, exit 2 = "check itself errored" (distinct from a fail, so a broken check doesn't read as the agent failing).

## Tasks (10, mapped to dimensions)

1. **instruction-following** -- underspecified prompt ("add rate limiting to the API"); scored on whether the agent states its assumptions vs silently guessing.
2. **correctness** -- fully-specified function to implement; objective check = provided test file passes.
3. **planning** -- "write an implementation plan for feature Y, no code"; rubric against a fixed checklist (steps, files identified, risks, test strategy).
4. **brainstorming-organic** / **brainstorming-explicit** -- ambiguous architecture question, once phrased naturally, once with "use the brainstorming skill"; rubric on trade-off depth + routing fairness note.
5. **graph-map-organic** / **graph-map-explicit** -- same organic/explicit split; objective check confirms a force-graph HTML was produced (node/edge counts > 0, not a tree-layout fallback).
6. **test-generation** -- "write tests for `<seeded untested function>`"; objective check = generated tests pass and cover the seeded edge case.
7. **code-review** -- review a diff with one seeded bug; objective check = review output references the seeded bug's file/line; subjective rubric on noise/false positives.
8. **code-quality** -- build a small well-specified feature; rubric on naming/duplication/structure of the resulting diff.
9. **context-management** -- multi-turn task (paste a large log file, then 3 follow-up questions in the same session); rubric on whether the final answer stays accurate and whether the tool reports compaction.
10. **efficiency** -- not a standalone prompt; a rollup of time/tool-calls/tokens/cache measured across tasks 1-9, tabulated per agent in the final report.

11 prompted tasks (task 10 is a rollup, not its own invocation -- brainstorming and graph-map each split into organic/explicit, so 8 single-prompt tasks + 2 organic/explicit pairs + 1 multi-turn task = 11), each run once per agent = 22 non-interactive CLI invocations per full benchmark run, all real paid Sonnet 5 usage.

## Error Handling

- CLI invocation times out (configurable, default 5 min) -> recorded as a task failure with reason `timeout`, not treated as a crash.
- Session log missing or unparseable -> metrics reported as `unavailable`, task's objective/rubric result still recorded independently.
- Objective check script itself throws -> exit 2, reported distinctly from a task failure, flagged in `report.md` for manual follow-up.
- Sample project left dirty after a run (e.g., agent's process hung) -> next task's reset (`git checkout -- sample-project && git clean -fd -e node_modules -- sample-project`) always runs before invocation, regardless of prior task's outcome.

## Testing Strategy

- Dry run: `run-benchmark.ps1` (no `-Execute`) prints every planned CLI invocation without running them -- verifies task list, prompts, and reset scoping are correct before spending real API usage.
- Smoke test: run task 2 (correctness) alone against both agents first, verify metrics extraction produces real numbers (not `unavailable`) before committing to the full 22-call run.
- Full run only after dry run + smoke test both look correct.

## Rollout Notes

- Real Sonnet 5 usage on both sides -- this costs real money/credits. `-Execute` flag is required and the script prints an invocation count + asks for confirmation before starting.
- Results are git-tracked under `Benchmarks/copilot-vs-claude/results/<timestamp>/` so repeat runs (e.g., after a Copilot CLI or skill-routing update) are comparable over time.
