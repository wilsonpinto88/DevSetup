---
name: dependency-management
description: >
  MUST USE when updating, migrating, or auditing project dependencies: upgrading
  packages, fixing security vulnerabilities (CVEs), resolving breaking changes,
  migrating to new major versions, or auditing outdated dependencies. Enforces
  incremental updates with verification at each step. Distinct from
  systematic-debugging (fixes application bugs) and refactoring (restructures
  application code). Triggers on "update dependencies", "upgrade packages",
  "npm update", "pip upgrade", "outdated", "vulnerability", "CVE", "security
  advisory", "breaking change", "migration guide", "dependency conflict",
  "peer dependency", "version bump", "npm audit", "dependabot".
---

# Dependency Management

Update one thing at a time. Verify after each. Never batch major upgrades.

## Why

Dependency bumps look trivial but are a top source of hard-to-diagnose breakage:
silent API changes, peer conflicts, transitive resolution shifts, build-tool
incompatibility. Small blast radius per step catches it early.

## Phase 1 — Audit

1. List outdated deps (`npm outdated`, `pip list --outdated`/`pip-audit`,
   `go list -m -u all`, `cargo outdated`, or the ecosystem's equivalent).
2. Categorize: **Security** (CVE, update now) > **Breaking** (major bump, plan) >
   **Feature** (minor/patch, low risk) > **Transitive** (usually lockfile-only).
3. Prioritize security first, then breaking-if-blocking, then feature. Don't update
   everything at once.

## Phase 2 — Impact Assessment (per dependency, especially majors)

1. Read the changelog/migration guide: breaking API changes, dropped
   runtime/platform support, peer dependency shifts, changed defaults.
2. Search the codebase for usage of changed APIs — separately for: direct calls/type
   refs, string literals/dynamic access, import statements/re-exports, test files
   and mocks. One search will not catch all of these.
3. Check peer dependency compatibility.
4. Classify risk: low (patch/minor, no breaking, limited usage) / medium (minor with
   deprecations, or major with no impact on our usage) / high (major with real impact,
   or deep integration like ORM/framework/build tool).

## Phase 3 — Update Incrementally

1. Update one dependency. Commit the lockfile change separately from code changes
   the update requires.
2. Run the full test suite. If it fails: does it match a documented breaking change?
   Apply the migration and re-run. If undocumented — investigate before proceeding,
   don't assume it's unrelated.
3. Run the build — type errors and import failures often surface here, not in tests.
4. Smoke-test at runtime if the dependency affects runtime behavior.
5. Repeat for the next dependency.

## Phase 4 — Verification

Full suite green (no skips, no flaky) · build succeeds · lockfile reflects exactly
the intended updates · no unrelated "while I'm here" changes bundled in.

## Security Vulnerabilities (urgent path)

1. Assess exploitability in *this* codebase's actual usage, not just CVSS score.
2. Check for a patched version. If none, document the workaround.
3. Patch exists → standard Phase 2→3→4 flow. No patch → note in known-issues with
   CVE, affected dependency, workaround, and a re-check date.

## Rules

- Never batch multiple major upgrades in one commit — you won't know which one broke it.
- Never delete a lockfile "to start fresh" — that silently bumps every transitive dep at once.
- Don't mix dev-dependency and prod-dependency upgrades in one commit unless tightly
  coupled (`typescript` + `@types/*`).
- If an update requires code changes, commit the version bump with those changes
  together — but don't mix two different dependency updates in one commit.
- Lockfile conflicts: accept one side, re-run install to regenerate — never hand-edit.

## Related Skills

`systematic-debugging` (unexpected failures after update) ·
`test-driven-development` (new tests for changed behavior) ·
`error-recovery` (log recurring dependency issues)
