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

3a. Graphify's `classify_file()` returns no type for any extension outside its
    `CODE_EXTENSIONS`/`DOC_EXTENSIONS`/etc. sets — those files are skipped by
    `extract` in both step 2 (full LLM extract) and step 3 (code-only), not just
    when no LLM backend is configured. Run these local extractors, in this repo,
    whenever their file types are present, regardless of which of step 2/3 ran:

    - `graph-map-fabasoft.py` when `.ducx-*` files are present. Reads the DSL
      locally and adds file, object-model, form, binding, use-case, operation,
      property, import, inheritance, containment, binding, and implementation
      nodes/edges without sending source to a third party.
    - `graph-map-powerfx.py` when `.fx` (Power Fx / PowerApps formula) files are
      present — Power Fx has no `CODE_EXTENSIONS` entry and no tree-sitter grammar
      exists for it, so `extract` silently skips these files in every mode. Reads
      each `<Control>.<Property>.fx` file locally (no LLM, no third-party source
      upload) and adds control, formula, builtin-call, navigation, variable,
      data-source, and control-reference nodes/edges.

    Do not label inferred relationships from either extractor as extracted. Merge
    each extractor's `graph.json` output with the Graphify extraction output (union
    nodes/links; if extract produced nothing, the local extractor's `graph.json` is
    the graph).
4. Ensure the output contains:

   - `graph.json` — symbols/files and typed edges.
   - `graph.html` — interactive force graph.
   - `GRAPH_REPORT.md` — corpus, hubs, communities, cycles, and hyperedges.
   - `manifest.json` and cache metadata when produced by Graphify.
5. If `graph.html` is missing after step 4, decide why before doing anything else:

   - **A project made only of file types a local extractor (step 3a) covers** —
     e.g. all-`.fx` Power Apps export, all-`.ducx-*` Fabasoft DSL — legitimately
     has nothing for `extract` to find; this is expected, not a failure. Render the
     merged `graph.json` for real with:

     ```powershell
     graphify cluster-only "$OUTPUT_DIR" --graph "$OUTPUT_DIR\graph.json"
     ```

     This runs the same community-clustering + force-graph viz pipeline `extract`
     uses internally, producing the full interactive `graph.html` (search, node
     info panel, community list) — not a flat tree. If an LLM backend is
     configured, clustering will also name communities; otherwise they stay as
     `Community N` placeholders, which is still acceptable.
   - **Otherwise** (project has code/doc files `extract` should have picked up but
     `graph.html` is still missing) — stop and report the failure: missing LLM
     backend, wrong `PROJECT_ROOT` scope, or extraction error. Ask the user to fix
     it and re-run step 2/3.

   In neither case fall back to `graphify tree`; its flat, low-detail render is
   never an acceptable substitute for the real clustered force-graph output.
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
