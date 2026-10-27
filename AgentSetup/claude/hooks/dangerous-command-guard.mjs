// PreToolUse guard: blocks destructive shell commands. Fails closed on unparsable input.
// Mirrors the Copilot guard in ~/.copilot/hooks/scripts/dangerous-command-guard.*
import { readFileSync } from 'node:fs';

const patterns = [
  /rm\s+-[a-zA-Z]*r[a-zA-Z]*f/,
  /rm\s+-[a-zA-Z]*f[a-zA-Z]*r/,
  /Remove-Item[^\n]*-Recurse[^\n]*-Force/i,
  /Remove-Item[^\n]*-Force[^\n]*-Recurse/i,
  /\bdd\s+if=/,
  /\bmkfs\b/,
  /git\s+push\s+[^\n]*(--force(?!-with-lease)|\s-f\b)/,
  /git\s+reset\s+--hard/,
  /git\s+clean\s+-[a-zA-Z]*f/,
  /Format-Volume/i,
  /\bformat\s+[a-zA-Z]:/i,
];

function block(reason) {
  process.stderr.write(`Blocked by dangerous-command-guard: ${reason} Confirm intent with the user before running manually.\n`);
  process.exit(2);
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8').replace(/^﻿/, ''));
} catch {
  block('could not parse tool input JSON; failing closed.');
}

const cmd = payload?.tool_input?.command;
if (typeof cmd !== 'string' || !cmd) process.exit(0);

for (const p of patterns) {
  if (p.test(cmd)) block(`command matches destructive pattern ${p}.`);
}
process.exit(0);
