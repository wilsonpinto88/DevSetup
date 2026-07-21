---
mode: 'agent'
description: 'Maintain known-issues.md — a project-specific error-to-solution map. Use to record resolved bugs or look up known errors before debugging.'
---

# Error Recovery

Maintain `known-issues.md` at the project root to avoid rediscovering known problems.

## Before Any Debugging Session

1. Check if `known-issues.md` exists (use `read_memory` with `file: "known-issues"` if MCP available)
2. Search it for the error message, code, or failing test name
3. If match found: try documented solution first before full investigation
4. If no match or solution doesn't work: proceed to `#systematic-debugging`

## When to Record a Fix

After resolving a bug, add to `known-issues.md` if the error is likely to recur:
- Environment-dependent errors (missing services, port conflicts, env vars)
- Configuration errors (wrong versions, missing dependencies)
- Test failures caused by external state (DB needs seeding, service needs starting)
- Platform-specific issues (Windows vs Unix paths, line endings)
- Errors that took significant investigation to diagnose

**Do NOT record:** one-off logic bugs (fix is in the code), errors already in README, transient network failures.

## Entry Format

```markdown
## [Short description]

**Error:** `exact error message or pattern`
**Cause:** One sentence explaining why this happens.
**Fix:**
\`\`\`bash
exact command or steps to resolve
\`\`\`
**Context:** When this typically occurs (e.g. "after fresh clone", "on Windows", "when DB not running").
```

## File Management

- Group entries by category: Environment, Dependencies, Tests, Build, Platform
- Keep under 50 entries — prune entries not relevant in months
- When a known issue is permanently fixed (root cause removed from codebase): delete the entry
- Use `write_memory` MCP tool with `file: "known-issues"` and `mode: "append"` to add entries
