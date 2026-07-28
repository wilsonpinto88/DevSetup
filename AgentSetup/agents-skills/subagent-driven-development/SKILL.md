---
name: subagent-driven-development
description: >
  Executes plans using parallel subagents with per-task implementation and
  staged review gates. Invoke for parallel plan execution in the current
  session. Routed by writing-plans handoff or using-copilot-superpowers for
  large plans with independent tasks.
---

# Subagent-Driven Development

Execute a plan with fresh subagents per task and strict review gates, using this
environment's `runSubagent` mechanism (see `dispatching-parallel-agents`).

## Required Start

Announce: `Using subagent-driven-development to execute this plan.`

## Core Flow

1. Read the plan once, extract all tasks, create tracking for them.
2. For each task:
   - Dispatch an implementer subagent with the full task text and minimal
     required context (not the whole plan file).
   - Resolve any implementer questions before it proceeds.
   - Require verification evidence from the implementer (test output, not claims).
   - Run a spec-compliance review pass. Fail → send back to implementer, re-review.
   - Run a code-quality review pass. Fail → send back, re-review.
   - Mark the task complete: flip its checkbox in the plan file, sync `state.md`
     if present.
   - Frontend/UI task → apply `frontend-design` standards.
3. Run a final whole-branch review.
4. Invoke `finishing-a-development-branch`.

## Parallel waves (default for independent tasks)

Sequential execution is the fallback for dependent tasks, not the default.

1. Group tasks into waves by file overlap and state dependency — no shared files,
   no sequential dependency → same wave.
2. Dispatch all wave implementers in a **single response** with multiple parallel
   subagent calls, not staggered across messages.
3. Review each with the same two-stage gate.
4. Run integration verification after the wave completes; sync checkboxes/state.
5. Any overlap risk within a wave → move that task to the next wave.

**Why single-dispatch matters for cost:** parallel subagents in one response share
the cached system-prompt prefix — each only pays full price for its small unique
task tail. Staggering wastes wall-clock time for no cache benefit.

## Process hygiene for service-dependent tasks

Subagents are stateless — they don't know about services a previous subagent
started. Include cleanup instructions in the task prompt: kill existing instances
and verify the port is free before starting, kill the service and verify cleanup
after tests complete. (Windows: `taskkill`/`netstat`/`tasklist`; Unix:
`pkill`/`lsof`/`pgrep`.) Exception: persistent dev servers the user explicitly
keeps running — document in `state.md`.

## Handling implementer status

**Done** → spec review. **Done with concerns** → read the concerns; correctness/
scope issues get addressed before review, observations get noted and proceed.
**Needs context** → provide it, re-dispatch. **Blocked** → assess: context gap
(re-dispatch with more context), needs more reasoning (escalate model if this
environment supports it), task too large (split it), plan is wrong (escalate to
user), user unavailable + non-critical (document in `state.md`, move to next
independent task).

Never force a retry without changing anything, never silently skip or mark a
blocked task complete.

## Hard rules

No implementation on `main`/`master` without explicit permission · never skip
spec or quality review · never accept unresolved review findings · don't make
subagents read entire plan files when the task text can be passed directly.

## Context isolation

Never forward parent session history to subagents. Build each prompt from
scratch: task text, acceptance criteria, needed file paths, relevant constraints
only — exclude prior analysis and failed hypotheses from other subagent runs.
This is also the cache-optimal shape: every subagent shares the cached system
prefix and pays full price only for its small task tail; forwarding history
breaks that cache sharing and multiplies input cost across the wave.

## Skill leakage prevention

Subagents can discover this environment's skills and invoke them, turning a
focused implementer into an orchestrator. Every subagent prompt MUST include:
> You are a focused subagent. Do not invoke workflow skills or route to other
> skills. Your only job is the task described below.

## Integration

Set up the workspace first with `using-git-worktrees` · use
`requesting-code-review` templates for the quality-review structure · finish
with `finishing-a-development-branch`.
