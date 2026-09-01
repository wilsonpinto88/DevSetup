"""Build a Graphify-compatible graph from Power Fx (.fx) formula files.

Handles the one-formula-per-file convention used by PowerApps doc/export
tools, where each file is named "<Control>.<Property>.fx" (e.g.
"App.OnStart.fx", "Screen1.OnVisible.fx") and contains a single formula body.
Mirrors graph-map-fabasoft.py: local regex extraction, no LLM, no source
sent to a third party.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

CALL = re.compile(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*\(")
CONTROL_PROPERTY_REF = re.compile(r"\b([A-Z][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b")
SET_CALL = re.compile(r"\bSet\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,")
UPDATE_CONTEXT_VAR = re.compile(r"\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*:")
NAVIGATE_CALL = re.compile(r"\bNavigate\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)")
DATASOURCE_CALL = re.compile(
    r"\b(?:Patch|Collect|ClearCollect|ForAll|Filter|Sort|SortByColumns|LookUp|Search|Remove|RemoveIf)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)"
)

BUILTIN_FUNCTIONS = {
    "Navigate", "Back", "Exit", "Set", "UpdateContext", "Patch", "Collect", "ClearCollect",
    "Clear", "Remove", "RemoveIf", "Notify", "If", "Switch", "ForAll", "With", "LookUp",
    "Filter", "Sort", "SortByColumns", "Search", "AddColumns", "DropColumns", "RenameColumns",
    "ShowColumns", "GroupBy", "Ungroup", "Distinct", "First", "FirstN", "Last", "LastN",
    "CountRows", "CountIf", "Sum", "SumIf", "Average", "AverageIf", "Max", "MaxIf", "Min",
    "MinIf", "Concatenate", "Concat", "Split", "Substitute", "Replace", "Left", "Right", "Mid",
    "Len", "Lower", "Upper", "Proper", "Trim", "TrimEnds", "Text", "Value", "Boolean",
    "DateValue", "TimeValue", "DateTimeValue", "Today", "Now", "DateAdd", "DateDiff", "Year",
    "Month", "Day", "Hour", "Minute", "Second", "IsBlank", "IsEmpty", "IsError", "IsNumeric",
    "Coalesce", "And", "Or", "Not", "IfError", "Error", "Validate", "Refresh", "RequestHide",
    "LoadData", "SaveData", "Download", "Print", "Launch", "Param", "ResetForm", "EditForm",
    "ViewForm", "NewForm", "SubmitForm", "Reset", "SetFocus", "Select", "Table", "Sequence",
    "Shuffle", "RandBetween", "Rand", "Round", "RoundUp", "RoundDown", "Trunc", "Abs", "Sqrt",
    "Power", "Mod", "Char", "JSON", "ParseJSON", "Match", "MatchAll", "IsMatch", "StartsWith",
    "EndsWith", "Find", "Assert", "Trace", "Choices", "DataSourceInfo", "ColorFade", "RGBA",
    "ColorValue", "User", "Blank", "GUID", "Char", "Concat",
}

# Context-reference identifiers that are not real control names.
CONTEXT_SELF_REFS = {"ThisItem", "Self", "Parent"}
# Enum namespaces that look like Control.Property but aren't controls.
ENUM_NAMESPACES = {
    "ScreenTransition", "Color", "Icon", "FontWeight", "Align", "VerticalAlign",
    "TextMode", "DisplayMode", "SelectionMode", "LayoutMode", "TextPosition",
    "BorderStyle", "Overflow", "ImagePosition", "ImageRotation",
}


def node_id(*parts: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]+", "_", ":".join(parts)).strip("_").lower()


def add_node(nodes: dict[str, dict], nid: str, label: str, source: str, kind: str, function: str = ""):
    if nid not in nodes:
        nodes[nid] = {
            "id": nid,
            "label": label,
            "source_file": source,
            "file_type": kind,
            "_origin": "extracted",
        }
    if function:
        nodes[nid]["function"] = function


def split_control_property(stem: str) -> tuple[str, str]:
    parts = stem.split(".")
    if len(parts) >= 2:
        return parts[0], ".".join(parts[1:])
    return stem, "formula"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    root = args.project.resolve()
    nodes: dict[str, dict] = {}
    links: list[dict] = []
    seen_edges: set[tuple[str, str, str]] = set()

    def edge(source: str, target: str, relation: str, confidence: str = "EXTRACTED"):
        key = (source, target, relation)
        if key not in seen_edges:
            seen_edges.add(key)
            links.append({
                "source": source,
                "target": target,
                "relation": relation,
                "source_file": nodes.get(source, {}).get("source_file", ""),
                "_origin": "extracted",
                "confidence": confidence,
            })

    files = sorted({p for p in root.rglob("*.fx") if p.is_file()})

    for path in files:
        relative = path.relative_to(root).as_posix()
        control_name, property_name = split_control_property(path.stem)

        control_id = node_id("control", control_name)
        add_node(nodes, control_id, control_name, relative, "control", "PowerApps control/screen")

        file_id = node_id("file", relative)
        add_node(nodes, file_id, path.name, relative, "fx", "Power Fx source file")

        formula_id = node_id("formula", control_name, property_name)
        add_node(nodes, formula_id, f"{control_name}.{property_name}", relative, "formula", "Power Fx formula")
        edge(control_id, formula_id, "defines")
        edge(file_id, formula_id, "contains")

        body = path.read_text(encoding="utf-8", errors="replace")

        for match in CALL.finditer(body):
            name = match.group(1)
            if name in BUILTIN_FUNCTIONS:
                fn_id = node_id("builtin", name)
                add_node(nodes, fn_id, name, "builtin", "builtin", "Power Fx built-in function")
                edge(formula_id, fn_id, "calls")
            elif name[:1].isupper() and name != control_name:
                # Likely a named component/user-defined formula, not a builtin.
                fn_id = node_id("function", name)
                add_node(nodes, fn_id, name, "unknown", "function", "Referenced named formula/component")
                edge(formula_id, fn_id, "calls")

        for match in NAVIGATE_CALL.finditer(body):
            target = match.group(1)
            screen_id = node_id("screen", target)
            add_node(nodes, screen_id, target, "unknown", "screen", "Navigation target screen")
            edge(formula_id, screen_id, "navigates-to")

        for match in SET_CALL.finditer(body):
            var_name = match.group(1)
            var_id = node_id("variable", var_name)
            add_node(nodes, var_id, var_name, "unknown", "variable", "Global variable")
            edge(formula_id, var_id, "sets")

        for match in UPDATE_CONTEXT_VAR.finditer(body):
            var_name = match.group(1)
            var_id = node_id("variable", var_name)
            add_node(nodes, var_id, var_name, "unknown", "variable", "Context variable")
            edge(formula_id, var_id, "sets")

        for match in DATASOURCE_CALL.finditer(body):
            ds_name = match.group(1)
            if ds_name in CONTEXT_SELF_REFS:
                continue
            ds_id = node_id("datasource", ds_name)
            add_node(nodes, ds_id, ds_name, "unknown", "datasource", "Data source/collection")
            edge(formula_id, ds_id, "uses-datasource")

        for match in CONTROL_PROPERTY_REF.finditer(body):
            ref_name, ref_property = match.groups()
            if ref_name in CONTEXT_SELF_REFS or ref_name == control_name or ref_name in ENUM_NAMESPACES:
                continue
            ref_control_id = node_id("control", ref_name)
            add_node(nodes, ref_control_id, ref_name, "unknown", "control", "Referenced control/screen")
            edge(formula_id, ref_control_id, "references")

    args.output.mkdir(parents=True, exist_ok=True)
    graph = {
        "directed": True,
        "multigraph": False,
        "graph": {
            "label": f"{root.name} (Power Fx functional map)",
            "source": str(root),
            "origin": "graph-map Power Fx extractor",
        },
        "nodes": list(nodes.values()),
        "links": links,
        "hyperedges": [],
    }
    (args.output / "graph.json").write_text(json.dumps(graph, indent=2), encoding="utf-8")
    print(f"wrote {args.output / 'graph.json'}: {len(nodes)} nodes, {len(links)} edges")


if __name__ == "__main__":
    main()
