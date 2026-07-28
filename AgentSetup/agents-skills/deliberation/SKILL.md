---
name: deliberation
description: >
  Use BEFORE brainstorming when facing a complex architectural, technology, or design
  decision where the options are not yet well-defined or the problem itself may need
  reframing. Assembles named stakeholder perspectives that each speak once without
  debate, then surfaces where they converge and where real tension remains — without
  forcing a premature choice. Triggers on "should we use X or Y", "not sure which
  approach", "evaluate these options", "what are the trade-offs between", "help me
  think through this decision", "architecture decision", "technology choice".
---

# Deliberation

Surface genuine tension in a decision before committing to a direction.

## When to use

- The options themselves aren't well-defined yet.
- The problem may be framed incorrectly (the real question hasn't been asked).
- Multiple legitimate constraints pull in different directions.
- `brainstorming` feels premature — no clear "right shape" for the solution yet.

**Not for:** decisions already well-framed with clear options — those go straight to
`brainstorming`.

## Procedure

1. **Name the decision** in one precise sentence.
2. **Pick 3-5 genuine stakeholder perspectives** with real, distinct stakes in *this*
   decision (e.g. Security, Developer Experience, Ops/Infra, Maintainability,
   Performance, User/Product). Three well-chosen beats five generic ones.
3. **Let each speak once** — what it values, the specific concern it sees, what it
   loses in each direction. No rebuttal, no ranking, no cross-talk between perspectives.
4. **Listen for:**
   - **Convergence** — where all perspectives agree despite different values (load-bearing;
     violating these causes problems regardless of which option wins).
   - **Live tension** — genuine disagreement, no option satisfies everyone. Surface it,
     don't paper over it.
   - **Reframe** — if hearing all perspectives reveals the original question was wrong.
5. **Output:**
   ```
   ## Deliberation: [decision]
   ### Perspectives
   **[Name]** — Values / Concern / Loses-left / Loses-right  (repeat)
   ### Convergence
   ### Live Tension
   ### Reframe (if any)
   ### Next step: proceed to brainstorming | return to user for more info | reframe changes scope, revisit premise-check
   ```

## Rules

- Don't force a conclusion — output is clarity about the decision space, not a recommendation.
- No perspective "wins." All tensions stay visible.
- If a reframe surfaces, get user acknowledgment before proceeding to `brainstorming`.
- Keep each perspective to 3-5 sentences.
- Fewer than 3 genuine perspectives → the decision is already well-framed, use
  `brainstorming` instead.
- Loop guard: never cycle between `deliberation` and `premise-check` more than once.
