---
mode: 'agent'
description: 'Execute an approved implementation plan in controlled batches with verification checkpoints. Use when a plan.md exists and implementation should begin.'
---

# Executing Plans

Implement an approved plan task-by-task with explicit verification after each.

## Required Start

State: "Executing plan: [plan name/path]. Starting at task [N]."

## Process

### Step 1: Load and Review Plan
1. Read the plan completely
2. Identify any concerns or ambiguities
3. If concerns exist: raise with user before starting — do not proceed on assumptions
4. If none: confirm starting task and proceed

### Step 2: Per-Task Execution

For each task in order:
1. Read the task spec completely before starting
2. Follow each step exactly as written
3. Run the verification command specified in the task
4. Confirm the expected output matches
5. Check the task checkbox — mark `[x]`
6. Announce: "Task N complete. Proceeding to Task N+1." before moving on

### Step 3: Verification Gate

Before moving to the next task:
- Verification command must pass
- If it fails: fix the failure before proceeding — do not skip ahead
- Do not mark a task complete based on "it should work" — run the command

### Step 4: Completion

After all tasks:
1. Run full project test suite
2. Invoke `#verification-before-completion`
3. Then invoke `#finishing-a-development-branch`

## Engineering Rigor

For architectural, high-risk, or cross-module tasks:
- Validate approach against plan requirements before coding
- Identify edge cases specific to this task
- Consider simpler approaches if the planned one reveals unexpected complexity — flag to user before deviating

## If a Task Fails

1. Stop. Do not proceed to next task.
2. Investigate using `#systematic-debugging`
3. Fix the failure
4. Re-run verification
5. Only then continue

Never skip a failing task and proceed — downstream tasks likely depend on it.
