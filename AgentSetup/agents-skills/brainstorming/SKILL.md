---
name: brainstorming
description: >
  Use before writing-plans when the problem itself is unclear, under-specified, or has
  multiple viable architectural directions. Structured design discussion to converge on
  an approach before committing to a plan. Triggers on "not sure how to approach this",
  "what are my options", "help me think through this", or when using-copilot-superpowers
  routes here for an unclear decision.
---

# Brainstorming

## When to Use

The problem needs reframing or the solution space is genuinely open — NOT for tasks
where the approach is already obvious and only the implementation details need planning
(that's `writing-plans` directly).

## Process

1. **Restate the problem** in your own words first — confirm you and the user are
   solving the same problem before generating options.
2. **Surface 2-4 genuinely different approaches** (not variations of the same idea):
   for each, briefly note the tradeoff (simplicity vs flexibility, effort vs
   completeness, risk vs speed).
3. **Surface constraints** the user hasn't stated but that likely apply (existing
   conventions in `/memories/repo/`, framework limitations, backward compatibility needs)
   — check these before presenting options, not after the user picks one.
4. **Recommend one**, with reasoning, but don't force it — present the tradeoff clearly
   enough that the user can override with their own judgment.
5. **Once converged**, hand off to `writing-plans` for the concrete implementation plan.

## Anti-patterns

- Jumping straight to one implementation without surfacing that alternatives existed.
- Presenting options without tradeoffs (just a list with no basis for choosing).
- Continuing to brainstorm after the user has already converged on a direction —
  move to planning once they've decided.
