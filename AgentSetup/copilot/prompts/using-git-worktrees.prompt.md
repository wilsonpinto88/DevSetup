---
mode: 'agent'
description: 'Create an isolated git worktree for experimental or risky work. Use before implementation when changes should not touch the current branch.'
---

# Using Git Worktrees

Create an isolated branch workspace for safe implementation.

## When to Use

- Work should be isolated from current branch
- Changes are experimental or high-risk
- Plan execution on a feature branch separate from main

## Setup Steps

### 1. Find or choose worktree directory

Check in order:
```bash
# Preferred
ls .worktrees 2>/dev/null
# Alternative
ls worktrees 2>/dev/null
```

Use whichever exists. If neither exists, use `.worktrees/`.

### 2. Verify it's gitignored

```bash
git check-ignore -q .worktrees
```

If NOT ignored: add `.worktrees/` to `.gitignore` and commit that change BEFORE creating the worktree. An uncommitted ignore entry is easy to lose.

### 3. Create the worktree

```bash
# New branch
git worktree add .worktrees/<branch-name> -b <branch-name>

# Existing branch
git worktree add .worktrees/<branch-name> <branch-name>
```

Branch naming: `feature/<topic>`, `fix/<issue>`, `experiment/<topic>`

### 4. Confirm

```bash
git worktree list
```

Report: exact path, branch name, base commit.

## Working In the Worktree

- All work happens in `.worktrees/<branch-name>/`
- The main working directory is untouched
- Each worktree is a full checkout — run all commands from inside it
- When done: invoke `#finishing-a-development-branch` to merge, PR, keep, or discard

## Cleanup

```bash
# After merging/discarding:
git worktree remove .worktrees/<branch-name>
git branch -d <branch-name>
```

Never delete worktree files manually — use `git worktree remove` to keep git's internal state consistent.
