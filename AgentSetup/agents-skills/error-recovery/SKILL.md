---
name: error-recovery
description: >
  Use whenever a non-obvious bug, gotcha, or environment quirk is discovered and fixed —
  persists it to /memories/repo/known-issues.md so it's never re-debugged from scratch in
  a future session. Triggers automatically at the end of systematic-debugging, or when
  the user says "remember this issue" / "don't let this happen again".
---

# Error Recovery

## Purpose

The single most wasteful pattern across sessions is re-discovering and re-debugging the
same non-obvious issue because nothing persisted the resolution. This skill closes that gap.

## When to Record an Entry

Record in `/memories/repo/known-issues.md` when:
- The root cause was non-obvious (took real investigation, not a 10-second glance).
- The issue could plausibly recur (environment quirk, tooling limitation, workspace
  convention that's easy to violate accidentally, a library's surprising behavior).
- Fixing it required a workaround that isn't self-explanatory from the code alone.

**Don't record**: trivial typos, one-off mistakes with no recurrence risk, or anything
already obvious from reading the code.

## Entry Format

```
## <Short title>
- Symptom: <what was observed>
- Root cause: <the actual underlying reason>
- Fix / workaround: <what resolved it>
- (optional) Where: <file/area if relevant>
```

Keep each entry to 3-5 lines. This is a lookup reference, not a postmortem document.

## Reading It

At session start (or before debugging something that feels familiar), check
`/memories/repo/known-issues.md` first — a 5-second read here can save re-doing an
entire investigation that was already solved.

## Anti-patterns

- Writing verbose incident-report-style entries instead of concise lookup entries.
- Never reading the file before starting to debug something that might already be logged.
- Letting the file grow unbounded with stale/irrelevant entries — prune entries that
  no longer apply (e.g. the underlying tool/library was upgraded and the quirk is gone).
