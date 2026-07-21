---
mode: 'agent'
description: 'Adversarial analysis — find concrete failure scenarios, race conditions, and edge cases that checklist-based review misses. Use after code review or for complex logic.'
---

# Red Team

Find concrete failure scenarios before they reach production.

## Purpose

This is adversarial logic analysis — not a security checklist. Goal: construct specific inputs, states, or sequences that cause the system to fail. Complement to `#requesting-code-review` (which covers OWASP/correctness). Red team covers logic, concurrency, and assumption violations.

## When to Use

After `#requesting-code-review` for changes involving:
- State machines or multi-step workflows
- Concurrent access to shared resources
- Complex business logic with branching conditions
- Data transformation pipelines
- Retry, recovery, or rollback logic
- Performance-critical paths with large inputs

## Process

### 1. Map the attack surface

Identify:
- All inputs (user-controlled, external services, file system, environment)
- All state transitions (what can change and when)
- All assumptions baked into the code (things that "should always be true")

### 2. Generate failure scenarios

For each input and state transition, ask:

**Logic bugs:** What input makes a condition evaluate the wrong way? What ordering of operations produces inconsistent state?

**Race conditions:** If two requests arrive simultaneously at this endpoint — what breaks? What shared resource has no lock?

**State corruption:** What sequence of valid operations leaves the system in an invalid state?

**Resource exhaustion:** What happens with 10x the expected load? 100x? With 1MB input? 1GB?

**Assumption violations:** What if the external service returns null? What if the file is empty? What if the user is unauthenticated but has a valid session cookie?

### 3. For each scenario found

Rate severity:
- **Critical** — data loss, auth bypass, system crash, incorrect financial calculation
- **High** — wrong behavior for significant user scenarios, silent data corruption
- **Medium** — edge case with workaround, degraded experience
- **Low** — cosmetic, negligible impact

For Critical and High findings: provide the exact reproduction case (input + sequence + expected vs actual).

### 4. Mark the single most impactful finding

Flag it explicitly as the priority fix. This is the entry point for the fix pipeline — address it first, re-assess after, then address the next.

## Output Format

```
## Red Team Report

### Critical
- [finding]: exact scenario → exact failure → fix recommendation

### High
- [finding]: exact scenario → exact failure → fix recommendation

### Medium / Low
- [brief list]

### Priority Fix
[single most impactful finding — fix this first]
```
