---
mode: 'agent'
description: 'Structured code review with built-in OWASP security analysis. Use after meaningful code changes or before merge/PR.'
---

# Requesting Code Review

## When

- After completing a feature or plan task
- After major refactor
- Before merge or PR finalization

## How

1. Determine review scope: run `git diff --name-only BASE_SHA..HEAD_SHA`
2. Review changed files plus any files that import/reference them (blast radius)
3. Check: correctness, code quality, test coverage, security

## Security Review (Built-In)

Automatically apply when changes touch:
- Authentication or authorization flows
- Input validation or output encoding
- API endpoints handling user data
- Secrets management or credential handling
- Cryptography, key management, or token generation
- Infrastructure, deployment, or CI/CD configs

**Security checklist:**
- OWASP Top 10 vulnerability scan (injection, broken auth, sensitive data exposure, XXE, broken access control, misconfig, XSS, insecure deserialization, known CVEs, insufficient logging)
- OWASP API Security Top 10: broken object/function-level authorization, unrestricted resource consumption, SSRF, mass assignment
- Input validation and injection risk (SQL, XSS, CSRF, command injection)
- Auth flow correctness (session handling, token expiry, privilege escalation, rate limiting on auth endpoints)
- Secrets handling (no hardcoded credentials, proper env var usage)
- Dependency vulnerabilities (known CVEs in imported packages)
- Security headers, CORS configuration, error message sanitization
- Logging hygiene (no secrets in logs, adequate audit trail)

**Severity enforcement:**
- **Critical/High → block merge** until addressed or user explicitly accepts risk with rationale
- **Medium → fix before merge** unless explicitly deferred

## Adversarial Analysis

For complex logic, concurrency, state machines, or critical data paths also check:
- Concrete failure scenarios (specific inputs that break it)
- Race conditions and concurrent access issues
- State corruption edge cases
- Resource exhaustion scenarios
- Retry/recovery/rollback logic failures

## Output Format

```
## Review: <scope>

### Correctness
- [finding or ✓ no issues]

### Code Quality
- [finding or ✓ no issues]

### Test Coverage
- [finding or ✓ no issues]

### Security
- [CRITICAL/HIGH/MEDIUM/LOW] finding: description → fix
- [or ✓ no security issues]

### Verdict
APPROVED / APPROVED WITH MINOR NOTES / CHANGES REQUIRED
Blocking issues: [list or none]
```
