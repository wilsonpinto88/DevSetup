---
mode: 'agent'
description: 'Turn rough requests into an approved design before any code is written. Use for new features, behavior changes, or architecture decisions.'
---

# Brainstorming

**Hard Gate: do not write code or edit files until design is explicitly approved.**

## Checklist

1. Inspect relevant project files, recent commits, existing patterns
2. Ask ALL clarifying questions in a single turn — multiple choice where possible
3. Propose 2-3 approaches with trade-offs and a clear recommendation
4. Present design in short sections — confirm each one
5. For existing codebases: match conventions unless there's compelling reason to diverge
6. **Failure-mode check** before approval — state top 2-3 ways the chosen approach could fail or not cover cases. For each: Critical (design fails for significant scenario) → revise. Minor (edge case) → document as non-goal.
7. Save approved design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
8. Invoke `#writing-plans` next

## Anti-Pattern

"This is too simple to need a design" — wrong. Every project goes through this. Simple projects are where unexamined assumptions cause the most wasted work. The design can be short; you must still present it and get approval.

## Scope Check

If the request touches 4+ independent subsystems or needs 20+ tasks: decompose into sub-projects first. Present decomposition for user approval before designing individual specs.

## Terminal State

The only output of brainstorming is an approved design doc and a handoff to `#writing-plans`. Do not start implementation from this skill.
