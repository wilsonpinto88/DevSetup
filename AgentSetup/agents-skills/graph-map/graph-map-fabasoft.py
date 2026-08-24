"""Build a Graphify-compatible graph from Fabasoft .ducx-* DSL files."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

DECLARATION = re.compile(
    r"^\s*(?:(public|abstract)\s+)?"
    r"(class|enum|struct|formpage|form|usecase|operation|instance)\s+"
    r"([A-Za-z_][\w@.-]*)"
    r"(?:\s*:\s*([^({]+))?"
)
IMPORT = re.compile(r"^\s*import\s+([^;]+);")
FIELD = re.compile(
    r"^\s*(?:(?:public|private|protected|static)\s+)*"
    r"(?:[\w@.-]+(?:\[\])?(?::[\w@.-]+)?)\s+"
    r"(attr[A-Za-z0-9_]+|obj[A-Za-z0-9_]+|bo[A-Za-z0-9_]+)\s*(?:[;{])"
)


def node_id(path: str, name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]+", "_", f"{path}:{name}").strip("_").lower()


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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    root = args.project.resolve()
    nodes: dict[str, dict] = {}
    links: list[dict] = []
    seen_edges: set[tuple[str, str, str]] = set()
    declarations: dict[str, str] = {}

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

    files = sorted(root.rglob("*.ducx-*"))
    files += sorted(root.rglob("*.ducx"))
    files = sorted({p for p in files if p.is_file()})

    for path in files:
        relative = path.relative_to(root).as_posix()
        file_id = node_id(relative, "file")
        suffix = path.name.split(".")[-1]
        add_node(nodes, file_id, path.name, relative, suffix, "Fabasoft DSL artifact")
        stack: list[tuple[str, str]] = []
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        for line_number, line in enumerate(lines, 1):
            imported = IMPORT.match(line)
            if imported:
                import_name = imported.group(1).strip()
                import_id = node_id("external", import_name)
                add_node(nodes, import_id, import_name, import_name, "import", "Imported component")
                edge(file_id, import_id, "imports")

            declaration = DECLARATION.match(line)
            if declaration:
                _, declaration_kind, name, parent = declaration.groups()
                declaration_id = node_id(relative, name)
                description = {
                    "class": "Object-model class",
                    "enum": "Enumeration",
                    "struct": "Aggregate type",
                    "formpage": "UI form page",
                    "form": "UI form",
                    "usecase": "Use case",
                    "operation": "Operation",
                    "instance": "Configuration instance",
                }[declaration_kind]
                add_node(nodes, declaration_id, name, f"{relative}:{line_number}", declaration_kind, description)
                edge(file_id, declaration_id, "contains")
                declarations[name] = declaration_id
                if parent:
                    parent_name = parent.strip().split()[-1]
                    parent_id = declarations.get(parent_name) or node_id("symbol", parent_name)
                    add_node(nodes, parent_id, parent_name, f"symbol:{parent_name}", "symbol")
                    edge(declaration_id, parent_id, "extends" if declaration_kind == "class" else "based-on")
                stack.append((declaration_kind, declaration_id))
                continue

            field = FIELD.match(line)
            if field and stack and stack[-1][0] == "class":
                field_name = field.group(1)
                field_id = node_id(relative, f"{stack[-1][1]}:{field_name}")
                add_node(nodes, field_id, field_name, f"{relative}:{line_number}", "property", "Class property")
                edge(stack[-1][1], field_id, "defines")

            if line.strip() == "}" and stack:
                stack.pop()

    args.output.mkdir(parents=True, exist_ok=True)
    graph = {
        "directed": True,
        "multigraph": False,
        "graph": {
            "label": f"{root.name} (Fabasoft functional map)",
            "source": str(root),
            "origin": "graph-map Fabasoft DSL extractor",
        },
        "nodes": list(nodes.values()),
        "links": links,
        "hyperedges": [],
    }
    (args.output / "graph.json").write_text(json.dumps(graph, indent=2), encoding="utf-8")
    print(f"wrote {args.output / 'graph.json'}: {len(nodes)} nodes, {len(links)} edges")


if __name__ == "__main__":
    main()
