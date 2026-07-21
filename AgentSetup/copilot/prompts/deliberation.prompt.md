---
mode: 'agent'
description: 'Structured decision analysis for complex architectural or technology choices where options are not yet well-defined. Use BEFORE brainstorming when the problem itself may need reframing.'
---

# Deliberation

Surface genuine tension in a decision before committing to a direction.

## When to Use

Use when:
- Options are not yet well-defined
- Problem may be framed incorrectly (real question hasn't been asked yet)
- Multiple legitimate constraints pull in different directions
- Brainstorming feels premature — no clear "right shape" for the solution

**Do NOT use** for well-framed decisions with clear options — go directly to `#brainstorming`.

## Procedure

### 1. Name the decision in one sentence
Be precise. A vague decision produces vague perspectives.

### 2. Identify 3-5 genuine stakeholder perspectives
Choose perspectives with real, distinct stakes. Not people — roles with coherent viewpoints:
- Security Engineer — attack surface, credentials, audit trail
- Developer Experience — implementation complexity, debugging, onboarding
- Ops/Infrastructure — deployment, scaling, failure modes
- Maintainability — long-term code health, testability, cognitive load
- Performance — latency, throughput, resource cost
- User/Product — visible impact, reliability, behaviour changes

Choose only perspectives with genuine stakes in this specific decision.

### 3. Each perspective speaks once
For each in turn: what it values, what concern it sees, what it loses in each direction.

**Ground rules:** Each speaks once only. No rebuttal. No ranking. No one perspective addresses another's concerns.

### 4. Surface convergence and tension

**Convergence** — where all/most perspectives agree despite different values. These are load-bearing: a decision that violates them will cause problems regardless of which option is chosen.

**Live tension** — where perspectives genuinely disagree and no option fully satisfies all. Do not paper over these — surface them explicitly.

### 5. Present the decision space

State:
- What the perspectives agree on (load-bearing constraints)
- Where genuine tension remains (the real trade-offs)
- What question the team needs to answer to move forward

**Do not force a conclusion.** The output is a clearer decision space, not a winner. After deliberation, proceed to `#brainstorming` with the reframed question.
