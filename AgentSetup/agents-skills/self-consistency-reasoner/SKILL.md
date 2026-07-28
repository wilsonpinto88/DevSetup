---
name: self-consistency-reasoner
description: >
  Internal reasoning technique invoked by systematic-debugging and
  verification-before-completion for high-stakes multi-step inference.
  Generates N independent reasoning paths and takes majority vote to surface
  confident-but-wrong single-chain failures. DO NOT invoke independently —
  this is embedded in the skills that need it.
---

# Self-Consistency Reasoner

Based on the Self-Consistency method (Wang et al., ICLR 2023). Complex problems
often have multiple valid reasoning paths; wrong reasoning tends to scatter across
different wrong answers. N independent paths + majority vote surfaces the correct
answer and gives a free confidence signal.

## When this fires

Invoked internally by `systematic-debugging` (root cause hypothesis generation)
and `verification-before-completion` (evidence evaluation), when: reasoning needs
3+ non-trivial steps, a single chain could go wrong, the answer has a fixed
answer set (root cause / yes-no / specific conclusion), and being wrong is costly.

## How many paths

| Problem | Paths |
|---|---|
| Binary verification | 3 |
| Root cause with 2-3 candidates | 5 |
| Complex multi-factor / high-stakes | 7 |

Default 5 — gains plateau fast; 5 captures most of the benefit of 40.

## Process

1. **Generate N independent paths.** Vary approach deliberately: different
   starting point/framing, forward-from-evidence vs backward-from-goal,
   different problem decomposition. For debugging, start from different points
   in the call stack / assume different failure modes. Each path ends with a
   clearly parsed final answer. Diversity is the whole point — same-approach
   paths just repeat one answer.
2. **Majority vote.** Consistency % = paths agreeing with the majority / total.
3. **Act:** 100% agreement → proceed with high confidence. 60-99% → proceed,
   note the minority view. ≤50% → **stop**, report the top 2 competing
   conclusions and the assumption that splits them, ask the user or gather more
   evidence.

## Output (internal process, don't show all paths)

```
**[Diagnosis/Verdict]**: [majority answer]
**Confidence**: [X/N paths agree] [high/moderate/low]
[if <80%]: brief note on the minority conclusion and where paths diverged
```

## Key principles

Majority vote beats probability-weighted aggregation — just count. Consistency
correlates with accuracy. Diversity beats quantity — 5 genuinely different paths
beat 10 that reason the same way. Works zero-shot, no examples needed.
