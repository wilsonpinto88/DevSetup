---
name: requesting-code-review
description: >
  Use when a change is complete and needs review before being considered final — especially
  for FULL-complexity tasks, or anything touching auth, input validation, API endpoints,
  secrets, crypto, deployment, or CI/CD. Runs a structured self-review pass with an
  integrated OWASP security checklist. Triggers on "review this", "is this ready",
  "check this over", or automatically at the end of executing-plans for FULL tasks.
---

# Requesting Code Review

## Process

1. **Spec compliance pass** — re-read the original request/plan. Does the change do
   exactly what was asked? No more (scope creep), no less (missing requirement)?
2. **Code quality pass**:
   - Naming clarity, no dead code left behind, no leftover debug prints/comments.
   - Consistent with existing conventions in the surrounding file/module.
   - No over-engineering — no abstractions or config options not requested.
3. **Security pass** (mandatory if the change touches auth, input validation, API
   endpoints, secrets, crypto, deployment, or CI/CD — otherwise skip this step):
   Run the OWASP Top 10 + OWASP API Security Top 10 checklist:
   - Injection (SQL, command, template)
   - Broken authentication / session handling
   - Sensitive data exposure (secrets in logs, plaintext storage)
   - Broken access control (missing authorization checks)
   - Security misconfiguration (default credentials, verbose errors in prod)
   - Insecure deserialization
   - Using components with known vulnerabilities
   - Insufficient logging/monitoring for security-relevant events
   - API-specific: broken object-level authorization, excessive data exposure, lack
     of rate limiting
   **Critical/High findings block delivery** until fixed or the user explicitly accepts
   the risk with a documented reason. Medium findings should be fixed unless the user
   explicitly defers them.
4. **Report findings** — organized by severity (Critical / High / Medium / Low), each
   with: what, why it matters, suggested fix. Don't just say "looks good" — show the
   checklist was actually applied.

## Adversarial Follow-up

For complex logic or anything security-sensitive, consider invoking `red-team` after
this pass for adversarial failure-mode testing — this skill catches "does it do what
was asked correctly"; `red-team` catches "how could this be broken or abused."

## Anti-patterns

- Rubber-stamp review ("LGTM") without actually re-reading the diff against the spec.
- Security pass skipped on a change that touches auth/secrets "because it's a small change."
- Listing findings without severity or without a concrete suggested fix.
