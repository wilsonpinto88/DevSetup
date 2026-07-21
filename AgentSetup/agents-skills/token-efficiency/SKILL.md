---
name: token-efficiency
description: >
  Always-on baseline for minimizing wasted tokens across a session — distinct from
  caveman (which compresses response prose). This skill governs tool-call and context
  discipline: what to read, what to re-read, what to batch. Applies to every session
  regardless of complexity classification.
---

# Token Efficiency

## Core Rules

1. **Don't re-read what's already in context.** If a file was read this session and
   hasn't been modified since, don't read it again — reference what you already have.
2. **Batch independent tool calls.** If you know you need to read 3 files or run 2
   independent searches, issue them together in one response, not sequentially across
   multiple turns.
3. **Don't verify already-confirmed facts.** If a path's existence, a function's
   signature, or a config value was already established this session, don't re-check it
   "just to be sure" — trust your own prior verification.
4. **Prefer targeted reads over full-file dumps.** Use `grep_search` to find the relevant
   section first, then read only that range, rather than reading an entire large file
   when only one function matters.
5. **Prior-turn pollution awareness.** Long reasoning chains and your own prior verbose
   responses can degrade later reasoning quality (context pollution) — when a
   conversation has drifted far from a self-contained new question, treat it as
   self-contained rather than over-anchoring on earlier (possibly now-stale) context.
6. **Subagents get scoped, fresh prompts** (see `dispatching-parallel-agents`) — don't
   carry forward the entire conversation history into a subagent dispatch; give it only
   what it needs.

## Relationship to `caveman`

`caveman` compresses the *prose* of responses (articles, filler, pleasantries — output
token savings). `token-efficiency` governs *tool-call and context* discipline (input/
context token savings). Both apply simultaneously; they address different halves of
the token budget.

## Anti-patterns

- Re-reading a file "to be safe" when nothing has changed it since the last read.
- Serial tool calls for independent operations that could have been batched.
- Dumping an entire large file into context when a targeted grep would have found the
  3 relevant lines.
