---
mode: 'agent'
description: 'Choose the branch outcome (merge, PR, keep, discard) after implementation is verified. Use when work is done and ready for integration.'
---

# Finishing a Development Branch

Close development work with an explicit integration choice.

## Step 1: Verify First

Run full project verification before offering options. If it fails — stop, return to implementation. Do not offer integration options on a failing codebase.

## Step 2: Detect Base Branch

Identify the merge base (`main`/`master` or repo default). Confirm with user if unclear.

## Step 3: Choose One of Four Options

Present exactly these options to the user:

1. **Merge** — merge to `<base-branch>` locally
2. **PR** — push branch and open a pull request
3. **Keep** — leave branch/worktree as-is for now
4. **Discard** — delete branch and worktree

## Step 4: Execute

### Option 1 — Merge
```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
# run verification again
git branch -d <feature-branch>
```

### Option 2 — PR
- Push the feature branch
- Create PR with:
  - **What changed** — one-paragraph summary
  - **Why** — motivation or problem solved (link to plan doc if one exists)
  - **How to verify** — exact commands a reviewer can run
  - **Notable decisions** — trade-offs made, alternatives rejected, non-obvious choices
- Extract relevant decisions from `session-log.md` if it exists

### Option 3 — Keep
- Report exact branch name and worktree path
- No changes made

### Option 4 — Discard
- Show full impact: what files and commits will be lost
- Require explicit typed confirmation: `discard`
- Only then delete branch and remove worktree

## Hard Rules

- Never merge with failing tests
- Never delete work without explicit confirmation
- Never force-push unless explicitly requested by user
