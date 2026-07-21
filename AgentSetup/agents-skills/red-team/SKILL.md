---
name: red-team
description: >
  Use for adversarial testing of complex or security-sensitive logic after
  requesting-code-review's structured pass. Actively tries to break the implementation
  rather than confirm it works. Triggers on "red team this", "find edge cases", "how
  could this fail", or when explicitly routed here for FULL-complexity security-relevant
  changes.
---

# Red Team

## Mindset

You are not confirming the code works — you are trying to prove it doesn't. Think like
an attacker or a hostile user, not like the author who already believes their logic is sound.

## Process

1. **Enumerate attack surfaces**: every input (user input, API params, file contents,
   env vars, config), every trust boundary (client vs server, user vs admin, internal
   vs external caller).
2. **For each surface, ask**:
   - What happens with empty/null/negative/huge/malformed input?
   - What happens if this function is called twice concurrently, or out of expected order?
   - What happens if a step fails halfway through (partial write, network drop mid-request)?
   - Can a lower-privilege actor reach a higher-privilege code path?
   - Can this be used for something other than its intended purpose (e.g. a search field
     used for injection, a file upload used for path traversal)?
3. **For each concrete failure mode found**, state:
   - The exact scenario that triggers it
   - The impact (data loss, privilege escalation, crash, silent wrong result)
   - Severity (Critical / High / Medium / Low) — same scale as `requesting-code-review`
4. **Do not fix silently** — report findings back through `requesting-code-review`'s
   severity-gated process. Critical/High findings block delivery same as any other
   security finding.

## Accountability Framing

Findings from this pass feed directly into what ships. A false positive here wastes
effort chasing a non-issue; a missed real issue ships a vulnerability. Be concrete and
evidence-based — cite the exact line/condition that fails, not a vague "this might be
unsafe."

## Scope Discipline

This is for complex or security-sensitive logic, not every one-line change. Don't invoke
this for MICRO or simple LIGHTWEIGHT tasks — it's disproportionate overhead for a config
tweak or a rename.
