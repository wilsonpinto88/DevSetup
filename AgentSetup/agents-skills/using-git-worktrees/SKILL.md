---
name: using-git-worktrees
description: >
  Use before implementation when work should be isolated from the current
  branch. Triggers on "use a worktree", "isolate this work", "don't touch
  main", experimental or risky changes that need isolation.
---

# Using Git Worktrees

Create an isolated branch workspace with safe defaults.

## Required Start

Announce: `Setting up an isolated worktree workspace.`

## Directory selection

Check, in order: `.worktrees/` (preferred, hidden) → `worktrees/` → a stated
preference in the repo's context file (`grep -i "worktree.*director" AGENTS.md`
or equivalent) → ask the user.

## Safety check

Before creating a project-local worktree dir, verify it's git-ignored
(`git check-ignore -q .worktrees` / `worktrees`). If not ignored: add the line to
`.gitignore` and **commit that change immediately** — an uncommitted ignore entry
is easy to lose and leaves the worktree exposed to accidental staging.

## Creation

1. Detect project root and pick a descriptive branch name.
2. `git worktree add <path> -b <BRANCH_NAME>`
3. **Critical:** `cd <path>` does not persist across separate shell calls in this
   environment — use the full path (`cd <path> && <command>`) in every subsequent
   command rather than assuming the working directory carried over.
4. Run project setup, auto-detected: `npm install` (package.json) /
   `cargo build` (Cargo.toml) / `pip install -r requirements.txt` or
   `poetry install` (Python) / `go mod download` (go.mod). None found → skip and
   note it.
5. Run the project's baseline test command (`npm test` / `cargo test` / `pytest` /
   `go test ./...`) to confirm the worktree starts clean.

## Failure handling

Baseline tests fail → report the failures, ask whether to continue or investigate
first.

## Success output

Full worktree path · branch name · ecosystem/setup command(s) run · baseline test
status.

## Integration

Use with `writing-plans` · required before `subagent-driven-development` or
`executing-plans` begin task execution. Cleanup is handled by
`finishing-a-development-branch`.
