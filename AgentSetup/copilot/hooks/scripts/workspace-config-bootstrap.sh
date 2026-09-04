#!/usr/bin/env bash
set -uo pipefail

raw="$(cat)"

workspace_root="$(pwd)"
if command -v node >/dev/null 2>&1; then
  extracted="$(printf '%s' "$raw" | node -e '
    let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{
      try{const p=JSON.parse(d);process.stdout.write(p.cwd||p.workspaceFolder||"");}catch(e){}
    });
  ' 2>/dev/null || true)"
  if [ -n "$extracted" ]; then
    workspace_root="$extracted"
  fi
fi

[ -d "$workspace_root" ] || exit 0

notes=()

vscode_dir="$workspace_root/.vscode"
mcp_path="$vscode_dir/mcp.json"

if command -v node >/dev/null 2>&1; then
  result="$(node -e '
    const fs = require("fs");
    const path = process.argv[1];
    let cfg = {};
    if (fs.existsSync(path)) {
      try { cfg = JSON.parse(fs.readFileSync(path, "utf8")); } catch (e) { cfg = {}; }
    }
    if (typeof cfg !== "object" || cfg === null) cfg = {};
    if (!cfg.servers) cfg.servers = {};
    if (!cfg.servers["context-mode"]) {
      cfg.servers["context-mode"] = { command: "context-mode" };
      fs.mkdirSync(require("path").dirname(path), { recursive: true });
      fs.writeFileSync(path, JSON.stringify(cfg, null, 2));
      console.log("created");
    }
  ' "$mcp_path" 2>/dev/null || true)"
  if [ "$result" = "created" ]; then
    notes+=("created/updated .vscode/mcp.json (added context-mode MCP server)")
  fi
fi

hooks_dir="$workspace_root/.github/hooks"
hook_path="$hooks_dir/context-mode.json"

if [ ! -f "$hook_path" ]; then
  mkdir -p "$hooks_dir"
  cat > "$hook_path" <<'EOF'
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      { "type": "command", "command": "context-mode hook vscode-copilot sessionstart", "timeoutSec": 15 }
    ],
    "preToolUse": [
      { "type": "command", "command": "context-mode hook vscode-copilot pretooluse", "timeoutSec": 10 }
    ],
    "postToolUse": [
      { "type": "command", "command": "context-mode hook vscode-copilot posttooluse", "timeoutSec": 10 }
    ],
    "preCompact": [
      { "type": "command", "command": "context-mode hook vscode-copilot precompact", "timeoutSec": 10 }
    ]
  }
}
EOF
  notes+=("created .github/hooks/context-mode.json (context-mode sessionStart/preToolUse/postToolUse/preCompact wiring)")
fi

if ! command -v context-mode >/dev/null 2>&1; then
  notes+=("WARNING: 'context-mode' is not on PATH -- the MCP server will fail to start. Run: npm install -g context-mode --ignore-scripts (see AgentSetup/README.md for the better-sqlite3 native-module workaround)")
fi

if [ ${#notes[@]} -gt 0 ]; then
  joined="$(printf '%s; ' "${notes[@]}")"
  joined="${joined%; }"
  # Minimal JSON string escaping (backslash, double-quote)
  escaped="$(printf '%s' "$joined" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  printf '{"hookSpecificOutput":{"additionalContext":"%s"}}\n' "$escaped"
fi

exit 0
