---
mode: 'agent'
description: 'Persist state across sessions (state.md) and generate project-map.md. Use when saving session state or mapping a project.'
---

# Context Management

## Route First

| You said | Go to |
|---|---|
| "map this project" / "generate project map" | Project Map section |
| "save state" / session ending with ongoing work | Save State section |
| Starting a task with existing project history | Grep `session-log.md` first |

---

## Project Map

Generate `project-map.md` at the project root. Include:
- What the project is (1-2 sentences)
- Architecture / project structure (directory tree with purpose of each folder)
- Key files table (path + role)
- Critical constraints (things that WILL break if violated)
- Intern assignment areas / incomplete work (if applicable)

Keep under 200 lines. Entries past 200 lines reduce session value — summarize, don't enumerate.

---

## Save State

Write `state.md` at the project root with these sections:

```markdown
# State — YYYY-MM-DD

## Current Goal
<one sentence>

## Decisions
- <decision made and why>

## Plan Status
- [x] Completed task
- [ ] Next task (current)
- [ ] Remaining tasks

## Evidence
- <verified facts relevant to next session>

## Open Questions
- <unresolved items>
```

**state.md is ephemeral** — overwrite it each time. It represents the current task only. Clear it when the task is complete.

---

## Session Log

Append to `session-log.md` only when there is something worth preserving across sessions:
- Architectural choices and why alternatives were rejected
- Constraints discovered the hard way
- Non-obvious facts that future sessions will need

Do NOT append: file lists, completion summaries, or anything derivable from git log. Keep entries under 115 words.

```markdown
## YYYY-MM-DD [saved]
Goal: <what was being worked on>
Decisions: <key choices made>
Approaches rejected: <and why>
Key facts: <constraints or discoveries>
```

---

## Known Issues

Append to `known-issues.md` when a bug is resolved that is likely to recur:

```markdown
## [Short description]
**Error:** `exact error message`
**Cause:** one sentence
**Fix:** exact steps or command
**Context:** when this typically occurs
```
