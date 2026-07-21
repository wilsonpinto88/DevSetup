---
mode: 'agent'
description: 'Structured dependency updates: audit, assess impact, update one-at-a-time, verify. Use for package upgrades, CVE fixes, breaking change migrations.'
---

# Dependency Management

Update one dependency at a time. Verify after each. Never batch major upgrades.

## Phase 1: Audit

List outdated dependencies before changing any versions:
- Node.js: `npm outdated` or `yarn outdated`
- Python: `pip list --outdated` or `pip-audit`
- .NET: `dotnet list package --outdated`

Categorize by urgency:
- **Security** — CVE with known exploit → update immediately
- **Breaking** — major version bump → plan carefully
- **Feature** — minor/patch → low risk
- **Transitive** — handled by lockfile update

Priority order: Security > Breaking (if blocking) > Feature.

## Phase 2: Impact Assessment

For each dependency (especially major versions):

1. Read the changelog/migration guide — look for renamed APIs, dropped platform support, changed peer dependencies, changed defaults
2. Search codebase for usage of changed APIs — check direct calls, type references, string literals, import statements, test files, mocks separately (don't assume one search caught everything)
3. Check peer dependency compatibility

Risk classification:
- **Low**: patch/minor, no breaking changes, limited codebase usage
- **Medium**: deprecation warnings, or major update with few relevant breaking changes
- **High**: major update with breaking changes that affect our usage

## Phase 3: Update Incrementally

For each dependency (one at a time, in priority order):

1. Update exactly one dependency
2. Run `npm install` / `pip install` / equivalent
3. Run the full test suite
4. Fix any breakage before moving to next dependency
5. Commit the update (one commit per dependency — makes rollback surgical)

**Never update multiple major versions in one commit.**

## Phase 4: Verify

After all updates:
- Full test suite passes
- Application starts and responds correctly
- No new security vulnerabilities introduced (`npm audit`, `pip-audit`)
- Lockfile committed alongside package manifest changes

## Security Fast-Path

For CVE fixes only (skip Phase 2 assessment):
1. Identify the vulnerable package
2. Find the patched version
3. Update directly: `npm install package@patched-version`
4. Run tests
5. Commit with message referencing the CVE
