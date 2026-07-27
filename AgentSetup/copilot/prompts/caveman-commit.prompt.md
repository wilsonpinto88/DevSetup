---
mode: 'agent'
description: 'Generate a Conventional Commit message in caveman style: compressed body, why over what, subject line still Conventional-Commit-compliant.'
---

# /caveman-commit

Look at staged changes (`git diff --cached`, fall back to `git diff` if nothing staged).
Write a commit message:

- Subject: Conventional Commit format (`type(scope): summary`), ≤50 chars, imperative mood
- Body: caveman style (see `caveman` skill) — drop articles/filler, keep fragments,
  explain **why** the change was made, not a restatement of the diff
- Code/identifiers/paths in the body: exact, unchanged
- No pleasantries, no "this commit does X" framing

Do not run `git commit` unless explicitly asked — output the message for review first,
or commit directly only if the user's request made that intent clear.
