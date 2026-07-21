---
mode: 'agent'
description: 'Decompose approved design into an executable implementation plan with exact paths, TDD ordering, and verification commands.'
---

# Writing Plans

Create an implementation plan with minimal ambiguity.

## Before Writing

- Design must be approved before creating a plan
- If multiple independent subsystems are in scope, create separate plans (one per subsystem)
- Map out which files will be created/modified and their responsibilities

## File Structure Section

Before tasks, define:
- Files to create (path + responsibility)
- Files to modify (path + what changes)
- Test files (path + what they cover)

Design principles:
- One clear responsibility per file
- Prefer smaller focused files over large ones
- Files that change together should live together
- In existing codebases, follow established patterns

## Plan Format

```markdown
# <Feature Name> Implementation Plan

**Goal:** <single sentence>
**Architecture:** <2-4 sentences>
**Tech Stack:** <languages/libraries/tools>
**Assumptions:** <list key assumptions and what each excludes>

---

## File Structure

### New Files
- `path/to/file.ts` — <responsibility>

### Modified Files
- `path/to/existing.ts` — <what changes>

---

## Tasks

### Task 1: <Name>

**Files:**
- Create: `path`
- Modify: `path`
- Test: `path`

**Does NOT cover:** <scenarios this task excludes — required when task adds conditional logic>

- [ ] Step 1: Write failing test
  ```lang
  // test code
  ```
  Run: `<command>`
  Expected: FAIL — "<reason>"

- [ ] Step 2: Implement
  // what to write

- [ ] Step 3: Verify
  Run: `<command>`
  Expected: PASS

- [ ] Step 4: Run full suite
  Run: `<command>`
  Expected: all green
```

## Task Rules

- Keep tasks independent when possible
- One action per step (~2-5 minutes each)
- Use exact file paths — no ambiguity
- TDD ordering: test before implementation for every behavior change
- Include exact verification commands with expected output
- Ask clarifying questions before finalizing if requirements are ambiguous

## Save Location

`docs/plans/YYYY-MM-DD-<feature-name>.md` (or user-specified location)
