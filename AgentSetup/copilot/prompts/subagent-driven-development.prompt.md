---
mode: 'agent'
description: 'Execute a plan using parallel subagents with per-task implementation and staged review gates. Use for large plans with independent tasks, after writing-plans, when work can be parallelized.'
---

# Subagent-Driven Development

Execute a plan with a fresh subagent per task and strict review gates — don't self-implement everything serially when tasks are independent.

## Per-Task Flow

1. Read the plan once, extract all tasks, create tracking (checkboxes).
2. For each task: dispatch an implementer subagent with full task text + minimal required context.
3. Resolve implementer questions before it codes.
4. Require verification evidence from the implementer (test output, not claims).
5. Run a spec-compliance review; on failure, return to implementer and re-review.
6. Run a code-quality review; on failure, return to implementer and re-review.
7. Mark task complete in plan.md (`- [ ]` → `- [x]`).
8. For frontend/UI tasks, apply frontend-design standards.

## Parallel Waves (default for independent tasks)

Group tasks into waves by file-overlap and dependency analysis — tasks touching disjoint files with no sequential dependency go in the same wave.

- Dispatch all implementers in **one message** with multiple parallel agent calls — not staggered. They share a cached system-prompt prefix, so simultaneous dispatch is both faster and cheaper.
- Review each task with the same two-stage gate (spec, then quality).
- Run integration verification after the wave completes before starting the next wave.

## Handling Implementer Status

- **DONE** → proceed to spec review.
- **DONE_WITH_CONCERNS** → read concerns; address correctness/scope issues before review.
- **NEEDS_CONTEXT** → provide missing info, re-dispatch.
- **BLOCKED** → diagnose: more context needed? bigger model needed? task too large — split it? plan itself wrong — escalate to user. Never force a blocked subagent to silently retry, never mark a blocked task complete.

## E2E Process Hygiene

Subagents are stateless — they don't know about background services (servers/DBs) started by prior subagents. Any subagent starting a service must: kill existing instances of that service first, verify the port is free, and clean up after itself. Document persistent dev servers the user explicitly keeps running.

After all waves complete, run a final whole-branch review before finishing the branch.
