---
name: finishing-a-development-branch
description: >
  MUST USE when implementation is verified and you need to choose the branch
  outcome: merge, PR, keep, or discard. Triggers on "merge this", "create a PR",
  "squash and merge", "we're done with this branch", "clean up the branch",
  "push this", "get it merged", after verification-before-completion passes.
---

# Finishing a Development Branch

Close development work with an explicit integration choice.

## Step 1: Verify

Run full project verification before offering options. If it fails, stop and go
back to implementation.

## Step 2: Identify base branch

Detect the merge base (`main`/`master` or repo default); confirm with the user if
unclear.

## Step 3: Offer exactly four options

1. Merge back to `<base-branch>` locally
2. Push branch and open a PR
3. Keep the branch as-is
4. Discard the branch

## Step 4: Execute

**Merge locally** — checkout base, pull latest, merge feature branch, re-run
verification, delete the merged branch.

**Push + PR** — push the branch, open a PR whose description includes: what
changed (one paragraph), why (link a plan doc if one exists), how to verify
(exact commands a reviewer can run), and notable decisions (trade-offs, rejected
alternatives — pull from `session-log.md`/`state.md` if present).

**Keep** — report the exact branch name and how to switch back to it.

**Discard** — show the destructive impact summary, require an exact typed
confirmation (`discard`), then delete the branch.

## Hard rules

- Never merge with failing tests.
- Never delete work without explicit confirmation.
- Never force-push unless explicitly requested.

## Final report

Selected option · commands executed · final branch status · PR link if created.
