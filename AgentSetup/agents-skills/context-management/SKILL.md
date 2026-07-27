---
name: context-management
description: >
  Use to generate or refresh /memories/repo/project-map.md — a persistent cache of
  workspace structure and conventions so future sessions don't re-explore from scratch.
  Triggers on "map this project", "set up project memory", or when using-copilot-superpowers'
  fresh-project gate fires and the user confirms setup.
---

# Context Management

## Purpose

Re-exploring a codebase's structure every session wastes tokens and time. This skill
builds a durable, minimal map once, and keeps it current as the workspace changes —
mirroring what `/memories/repo/project-map.md` is used for in this environment.

## Generating project-map.md (first time)

1. List top-level folders (`list_dir` on workspace root) — don't recurse deep, just
   get the shape.
2. Identify: main source folders, docs folders, config/build files, any obvious
   conventions (naming patterns, folder-per-feature, monorepo structure).
3. Write `/memories/repo/project-map.md` with:
   - Workspace roots (if multi-root)
   - Key folders and what lives in them (one line each — not exhaustive file lists)
   - Conventions observed (naming, templates, required patterns)
   - Any custom skills specific to this workspace

**Keep it minimal.** Research on repo-level context files shows verbose, exhaustive
directory enumerations don't help agents find files faster and increase token cost
per session. One line per key folder, not a full tree.

## Keeping It Current (staleness check)

At the start of a session, before relying on `project-map.md`:
1. Check if the map references files/folders that no longer exist, or if obviously
   new major folders appeared that aren't mentioned.
2. Only re-explore the parts that changed — don't regenerate the whole map from scratch
   if 90% of it is still accurate.
3. Update just the stale sections.

## Anti-patterns

- Writing an exhaustive file-by-file listing (defeats the purpose — high token cost,
  low benefit, per the research this convention is built on).
- Regenerating the entire map every session instead of doing an incremental staleness check.
- Skipping this for a long-running project that's been re-explored from scratch in
  3+ separate sessions already — that's the exact waste this skill prevents.
