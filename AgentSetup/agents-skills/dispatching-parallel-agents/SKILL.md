---
name: dispatching-parallel-agents
description: >
  Use when a task needs multiple independent explorations or research threads that don't
  depend on each other's results. Governs when and how to use the Explore subagent (via
  runSubagent) instead of doing sequential manual searches. Triggers on broad investigation
  tasks, "find everywhere X is used", or multi-part research questions.
---

# Dispatching Parallel Agents

## When to Use

- Independent read-only research questions that don't depend on each other's answers.
- Broad codebase exploration where chaining many searches/reads manually would clutter
  the main conversation with intermediate noise.
- A question you're not confident you'll answer in the first 1-2 searches.

## How (in this environment)

This environment's equivalent of Claude Code's subagent dispatch is the **`Explore`**
agent, invoked via `runSubagent`. Key differences from doing it manually:
- The subagent's exploration noise (many tool calls, false starts) stays out of the
  main conversation — only its final summary comes back.
- Give it a **highly detailed, self-contained prompt**: what to look for, desired
  thoroughness (quick/medium/thorough), and exactly what to report back. It cannot
  ask follow-up questions — one shot, stateless.
- Multiple independent `Explore` calls CAN be dispatched in the same response if the
  questions are truly independent of each other's results (per the parallelization
  guidance already in this environment's core instructions) — but do not call
  `semantic_search` in parallel with itself or with other searches.

## Anti-patterns

- Using a subagent for a task that's simpler to just do directly with 1-2 tool calls —
  disproportionate overhead.
- Vague subagent prompts ("look into the auth stuff") that force it to guess scope.
- Dispatching agents whose results depend on each other — that's sequential, not parallel;
  run them one after another instead, feeding results forward.
- Forgetting to specify what the subagent should return — it only gets one message back
  to you, so under-specifying wastes the whole dispatch.
