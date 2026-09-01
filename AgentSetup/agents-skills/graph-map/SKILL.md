---
name: graph-map
description: Build a Graphify project map with code symbols, functional relationships, communities, report, and interactive HTML output.
---

# Graph Map

Build a project-scoped Graphify map like the reference `graphify-out` corpus. Prefer the
real Graphify extraction output over hand-authored file trees.

## Required inputs

Ask for, or infer:

- `PROJECT_ROOT`: the project checkout to map.
- `OUTPUT_DIR`: where the map must be saved. If the user gives a feature-plan folder,
  use `<feature-folder>\Plan\graphify-out`.
- Whether to include documentation and converted artifacts.

Never scan the workspace root when the user names a project checkout. Keep the graph
source and all generated artifacts inside `OUTPUT_DIR`.

## Build procedure

1. Inspect `PROJECT_ROOT` and identify the project boundary. Preserve the project's
   `.gitignore`; use `--no-gitignore` only when the user explicitly wants ignored
   files included.
2. Run a full extraction when an LLM backend is configured:

   ```powershell
   graphify extract "$PROJECT_ROOT" --out "$OUTPUT_PARENT" --force
   ```

   `OUTPUT_PARENT` is the directory whose child `graphify-out` should be used. Move
   or copy the resulting `graphify-out` contents into the requested `OUTPUT_DIR` only
   after checking that the output belongs to the selected project.
3. If no LLM backend is configured, run the deterministic fallback:

   ```powershell
   graphify extract "$PROJECT_ROOT" --out "$OUTPUT_PARENT" --code-only --force
   ```

   For unsupported DSL/document formats, run `graph-map-fabasoft.py` from this skill
   when `.ducx-*` files are present. It reads the DSL locally and adds file,
   object-model, form, binding, use-case, operation, property, import, inheritance,
   containment, binding, and implementation nodes/edges without sending source to
   a third party. Do not label inferred relationships as extracted.
4. Ensure the output contains:

   - `graph.json` — symbols/files and typed edges.
   - `graph.html` — interactive force graph.
   - `GRAPH_REPORT.md` — corpus, hubs, communities, cycles, and hyperedges.
   - `manifest.json` and cache metadata when produced by Graphify.
5. If only `graph.json` exists (no `graph.html` from `extract`), stop and report the
   failure — missing LLM backend, wrong `PROJECT_ROOT` scope, or extraction error.
   Do not fall back to `graphify tree`; its flat, low-detail render is not an acceptable
   substitute for the real extract output. Ask the user to fix the backend/scope and
   re-run step 2/3.
6. Run focused checks:

   ```powershell
   graphify god-nodes --graph "$OUTPUT_DIR\graph.json" --top 20
   graphify diagnose multigraph --graph "$OUTPUT_DIR\graph.json"
   ```

   Confirm the graph has meaningful code/function nodes, not only directory nodes.
   Record skipped/unsupported files and the extraction mode in `MAP_README.md`.

## Functional mapping rules

When the project uses a DSL or file types Graphify cannot parse:

- Extract declarations from source: classes, interfaces, enums, structs, forms,
  operations/use cases, event handlers, and configuration instances.
- Add functional nodes only for behavior that is evidenced by source.
- Link behavior using explicit relations such as `defines`, `extends`, `imports`,
  `implements`, `binds`, `renders`, `calls`, `configures`, and `consumes`.
- Use `EXTRACTED` only for direct source evidence; use `INFERRED` for architecture
  conclusions and explain them in `functional-map.md`.
- Map each requested feature/task to its behavior entry point and the downstream
  UI, binding, configuration, workflow, and test surfaces.

## Output contract

Return the exact output paths and a short coverage statement containing:

- source project root;
- graph node/edge counts;
- extraction mode;
- number or list of unsupported/skipped file types;
- links to `graph.html`, `GRAPH_REPORT.md`, and `functional-map.md` if present.

Do not delete an existing map without explicit confirmation. Do not mix graphs from
different projects. Do not claim functionality coverage when the graph contains only
file hierarchy.
