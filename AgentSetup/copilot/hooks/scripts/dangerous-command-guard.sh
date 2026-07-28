#!/usr/bin/env bash
set -euo pipefail

raw="$(cat)"
cmd="$(echo "$raw" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | sed -E 's/.*"command"[[:space:]]*:[[:space:]]*"([^"]*)"/\1/' || true)"

if [ -z "$cmd" ]; then
  echo '{"permissionDecision":"allow"}'
  exit 0
fi

patterns=(
  'rm +-[a-zA-Z]*r[a-zA-Z]*f'
  'rm +-[a-zA-Z]*f[a-zA-Z]*r'
  'dd +if='
  'mkfs'
  'git +push +.*--force'
  'git +reset +--hard'
)

for p in "${patterns[@]}"; do
  if echo "$cmd" | grep -Eq "$p"; then
    reason="Blocked by dangerous-command-guard hook: command matches destructive pattern '$p'. Confirm intent with the user before running manually."
    printf '{"permissionDecision":"deny","permissionDecisionReason":"%s"}\n' "$reason"
    exit 2
  fi
done

echo '{"permissionDecision":"allow"}'
exit 0
