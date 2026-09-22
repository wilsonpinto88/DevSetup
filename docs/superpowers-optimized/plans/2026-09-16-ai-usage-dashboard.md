# AI Usage Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-optimized:subagent-driven-development (recommended) or superpowers-optimized:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VS Code extension that reads local Claude Code and Copilot usage logs and renders a Copilot-Cost-Lens-style dashboard (tokens, models, workspaces, sessions, time-range charts).

**Architecture:** Pure-TS core (log parsing, aggregation, allowance resolution) with zero VS Code dependency, unit-tested with vitest; a thin `vscode`-dependent shell (extension activation, webview panel, globalState caching, GitHub auth session) wired on top and verified manually in the Extension Development Host.

**Tech Stack:** TypeScript, VS Code Extension API, Node.js `fs`/`path`/`os`, vitest (unit tests), Chart.js (MIT, bundled locally), esbuild-free `tsc` compile, `vsce` for packaging.

**Assumptions:**
- Assumes the machine has `~/.claude/projects/**/*.jsonl` and/or `~/.copilot/session-state/*/events.jsonl` present — will show "No data found" for a source with no logs, not an error.
- Assumes JSONL files are append-only (never rewritten in place except truncation/rotation) — the incremental scanner's truncation-detection path handles rotation but assumes it's rare, not the common case.
- Assumes the reference spec at `docs/superpowers-optimized/specs/2026-09-16-ai-usage-dashboard-design.md` is final — this plan implements it as written (Chart.js, not Highcharts; local-log-only; no $ for Claude Code).

---

## File Structure

```
ai-usage-dashboard/
  package.json
  tsconfig.json
  vitest.config.ts
  .gitignore
  src/
    logScanner/
      types.ts              # UsageEvent interface
      workspaceNormalize.ts # path -> display basename
      claudeCodeParser.ts   # parse one Claude Code JSONL line/file
      copilotParser.ts      # parse one Copilot events.jsonl line/file + workspace.yaml extraction
      scanCache.ts          # incremental byte-offset scan primitive (pure, fs injected)
      logRepository.ts      # walks real directories, ties parsers + scanCache together (real fs, no vscode dep)
    aggregator.ts           # totals, group-by-model, group-by-workspace, time-bucketed series
    copilotAllowance.ts     # GitHub auth session -> allowance, with manual fallback
    extension.ts            # activate(), commands, globalState wiring, calls logRepository/aggregator
    webviewPanel.ts         # creates/updates the webview panel, posts aggregated data as messages
  media/
    main.js                 # webview client: Chart.js rendering, time-range toggle, VS Code theme vars
    main.css
    vendor/
      chart.umd.min.js      # vendored Chart.js build (no CDN — webview CSP)
  test/
    workspaceNormalize.test.ts
    claudeCodeParser.test.ts
    copilotParser.test.ts
    scanCache.test.ts
    logRepository.test.ts
    aggregator.test.ts
    copilotAllowance.test.ts
```

---

### Task 1: Scaffold the extension project

**Files:**
- Create: `ai-usage-dashboard/package.json`
- Create: `ai-usage-dashboard/tsconfig.json`
- Create: `ai-usage-dashboard/vitest.config.ts`
- Create: `ai-usage-dashboard/.gitignore`
- Create: `ai-usage-dashboard/src/logScanner/types.ts`

- [x] **Step 1: Create `package.json`**

```json
{
  "name": "ai-usage-dashboard",
  "displayName": "AI Usage Dashboard",
  "description": "Local usage dashboard for Claude Code and GitHub Copilot",
  "version": "0.1.0",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "main": "./out/extension.js",
  "activationEvents": [],
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -w -p ./",
    "test": "vitest run",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/vscode": "^1.85.0",
    "@vscode/vsce": "^2.24.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [x] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "outDir": "out",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

- [x] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
```

- [x] **Step 4: Create `.gitignore`**

```
out/
node_modules/
*.vsix
```

- [x] **Step 5: Create `src/logScanner/types.ts`**

```ts
export interface UsageEvent {
  source: 'claude-code' | 'copilot';
  sessionId: string;
  timestamp: string; // ISO 8601
  model: string;
  workspace: string; // normalized basename, e.g. "Fabasoft_WS"
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  nanoAiu?: number;        // Copilot only
  premiumRequests?: number; // Copilot only
}
```

- [x] **Step 6: Install dependencies and verify compile**

Run: `cd ai-usage-dashboard && npm install && npm run compile`
Expected: exits 0, `out/` directory created (empty besides nothing yet, no errors — no `.ts` files reference vscode yet so this just validates tsconfig)

- [x] **Step 7: Commit**

```bash
git add ai-usage-dashboard/package.json ai-usage-dashboard/tsconfig.json ai-usage-dashboard/vitest.config.ts ai-usage-dashboard/.gitignore ai-usage-dashboard/src/logScanner/types.ts
git commit -m "ai-usage-dashboard: scaffold extension project"
```

---

### Task 2: Workspace path normalization

**Files:**
- Create: `ai-usage-dashboard/src/logScanner/workspaceNormalize.ts`
- Test: `ai-usage-dashboard/test/workspaceNormalize.test.ts`

**Does NOT cover:** relative paths (all inputs are already-absolute `cwd`/`git_root` values from the source logs) — a relative path input returns its last segment same as absolute, which is acceptable but not a scenario this function is designed to validate.

- [x] **Step 1: Write failing test**

```ts
// ai-usage-dashboard/test/workspaceNormalize.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeWorkspace } from '../src/logScanner/workspaceNormalize';

describe('normalizeWorkspace', () => {
  it('extracts basename from a Windows path', () => {
    expect(normalizeWorkspace('c:\\DEV\\Fabasoft_WS')).toBe('Fabasoft_WS');
  });

  it('extracts basename from a nested worktree path', () => {
    expect(
      normalizeWorkspace(
        'C:\\Users\\Wilson.Pinto\\DevSetup\\.worktrees\\copilot-vs-claude-benchmark'
      )
    ).toBe('copilot-vs-claude-benchmark');
  });

  it('strips a trailing slash', () => {
    expect(normalizeWorkspace('c:\\DEV\\Fabasoft_WS\\')).toBe('Fabasoft_WS');
  });

  it('returns "unknown" for empty input', () => {
    expect(normalizeWorkspace('')).toBe('unknown');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd ai-usage-dashboard && npx vitest run test/workspaceNormalize.test.ts`
Expected: FAIL with "Cannot find module '../src/logScanner/workspaceNormalize'"

- [x] **Step 3: Implement**

```ts
// ai-usage-dashboard/src/logScanner/workspaceNormalize.ts
export function normalizeWorkspace(rawPath: string): string {
  if (!rawPath) {
    return 'unknown';
  }
  const normalized = rawPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const segments = normalized.split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : 'unknown';
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd ai-usage-dashboard && npx vitest run test/workspaceNormalize.test.ts`
Expected: PASS (4/4)

- [x] **Step 5: Commit**

```bash
git add ai-usage-dashboard/src/logScanner/workspaceNormalize.ts ai-usage-dashboard/test/workspaceNormalize.test.ts
git commit -m "ai-usage-dashboard: add workspace path normalization"
```

---

### Task 3: Claude Code log parser

**Files:**
- Create: `ai-usage-dashboard/src/logScanner/claudeCodeParser.ts`
- Test: `ai-usage-dashboard/test/claudeCodeParser.test.ts`

**Does NOT cover:** lines where `message.usage` is present but `message` itself represents a non-assistant record type (e.g. tool results) — only lines with both `message.usage` and `timestamp` are treated as usage events, everything else (hook output, thinking-only deltas, tool calls) is silently skipped, matching the real log sample where only assistant messages carry `usage`.

- [ ] **Step 1: Write failing test**

```ts
// ai-usage-dashboard/test/claudeCodeParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseClaudeCodeFile } from '../src/logScanner/claudeCodeParser';

const REAL_SAMPLE_LINE = JSON.stringify({
  parentUuid: '018c3e48-2b1f-42e3-b014-f5af8e8251e6',
  isSidechain: false,
  message: {
    model: 'claude-sonnet-5',
    id: 'msg_011CeufheGFRm39ToRTroiSz',
    type: 'message',
    role: 'assistant',
    usage: {
      input_tokens: 2,
      cache_creation_input_tokens: 20990,
      cache_read_input_tokens: 36341,
      output_tokens: 151,
    },
  },
  timestamp: '2026-09-10T11:19:24.197Z',
  cwd: 'c:\\DEV\\Fabasoft_WS',
});

describe('parseClaudeCodeFile', () => {
  it('parses a real-shaped usage line into a UsageEvent', () => {
    const events = parseClaudeCodeFile(REAL_SAMPLE_LINE, 'session-abc');
    expect(events).toEqual([
      {
        source: 'claude-code',
        sessionId: 'session-abc',
        timestamp: '2026-09-10T11:19:24.197Z',
        model: 'claude-sonnet-5',
        workspace: 'Fabasoft_WS',
        inputTokens: 2,
        outputTokens: 151,
        cacheReadTokens: 36341,
        cacheWriteTokens: 20990,
      },
    ]);
  });

  it('skips lines without message.usage', () => {
    const line = JSON.stringify({ parentUuid: null, message: { type: 'message' } });
    expect(parseClaudeCodeFile(line, 's1')).toEqual([]);
  });

  it('skips malformed JSON lines without throwing', () => {
    expect(() => parseClaudeCodeFile('{not json', 's1')).not.toThrow();
    expect(parseClaudeCodeFile('{not json', 's1')).toEqual([]);
  });

  it('skips blank lines', () => {
    expect(parseClaudeCodeFile('\n\n   \n', 's1')).toEqual([]);
  });

  it('parses multiple lines from one file', () => {
    const content = [REAL_SAMPLE_LINE, REAL_SAMPLE_LINE].join('\n');
    expect(parseClaudeCodeFile(content, 's1')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai-usage-dashboard && npx vitest run test/claudeCodeParser.test.ts`
Expected: FAIL with "Cannot find module '../src/logScanner/claudeCodeParser'"

- [ ] **Step 3: Implement**

```ts
// ai-usage-dashboard/src/logScanner/claudeCodeParser.ts
import { UsageEvent } from './types';
import { normalizeWorkspace } from './workspaceNormalize';

export function parseClaudeCodeLine(line: string, sessionId: string): UsageEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  let record: any;
  try {
    record = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const msg = record.message;
  if (!msg || !msg.usage || !record.timestamp) {
    return null;
  }
  const usage = msg.usage;
  return {
    source: 'claude-code',
    sessionId,
    timestamp: record.timestamp,
    model: msg.model ?? 'unknown',
    workspace: normalizeWorkspace(record.cwd ?? ''),
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

export function parseClaudeCodeFile(content: string, sessionId: string): UsageEvent[] {
  return content
    .split('\n')
    .map((line) => parseClaudeCodeLine(line, sessionId))
    .filter((e): e is UsageEvent => e !== null);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ai-usage-dashboard && npx vitest run test/claudeCodeParser.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add ai-usage-dashboard/src/logScanner/claudeCodeParser.ts ai-usage-dashboard/test/claudeCodeParser.test.ts
git commit -m "ai-usage-dashboard: add Claude Code log parser"
```

---

### Task 4: Copilot log parser + workspace.yaml extraction

**Files:**
- Create: `ai-usage-dashboard/src/logScanner/copilotParser.ts`
- Test: `ai-usage-dashboard/test/copilotParser.test.ts`

**Does NOT cover:** Copilot output-token counts — the real `session.usage_checkpoint` sample captured from this machine does not expose a distinct completion/output token field (only `prompt_tokens`, `cache_read`, `cache_write` per model), so `outputTokens` is always `0` for Copilot events. This is a known data limitation, not a bug — `totalNanoAiu`/`totalPremiumRequests` remain the reliable Copilot cost signals.

- [x] **Step 1: Write failing test**

```ts
// ai-usage-dashboard/test/copilotParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseCopilotFile, extractWorkspaceFromYaml } from '../src/logScanner/copilotParser';

const REAL_SAMPLE_LINE = JSON.stringify({
  type: 'session.usage_checkpoint',
  data: {
    totalNanoAiu: 4002830000,
    totalPremiumRequests: 1,
    lastActiveModel: 'claude-sonnet-5',
    promptCacheBreakState: [
      {
        conversation: 'main',
        models: {
          'claude-sonnet-5': {
            model: 'claude-sonnet-5',
            prompt_tokens: 32354,
            cache_read: 17859,
            cache_write: 14493,
          },
        },
      },
    ],
  },
  id: '4da6ee11-9aeb-408b-a5d9-3f6f8c8460a6',
  timestamp: '2026-09-07T11:52:50.537Z',
});

const WORKSPACE_YAML = [
  'id: 012a299b-844e-4492-b5a2-d47368a45f38',
  'cwd: C:\\Users\\Wilson.Pinto\\DevSetup\\.worktrees\\copilot-vs-claude-benchmark\\Benchmarks\\copilot-vs-claude',
  'git_root: C:\\Users\\Wilson.Pinto\\DevSetup\\.worktrees\\copilot-vs-claude-benchmark',
  'repository: wilsonpinto88/DevSetup',
].join('\n');

describe('extractWorkspaceFromYaml', () => {
  it('prefers git_root over cwd', () => {
    expect(extractWorkspaceFromYaml(WORKSPACE_YAML)).toBe(
      'C:\\Users\\Wilson.Pinto\\DevSetup\\.worktrees\\copilot-vs-claude-benchmark'
    );
  });

  it('falls back to cwd when git_root is absent', () => {
    const yaml = 'cwd: C:\\DEV\\Fabasoft_WS\n';
    expect(extractWorkspaceFromYaml(yaml)).toBe('C:\\DEV\\Fabasoft_WS');
  });

  it('returns empty string when neither key is present', () => {
    expect(extractWorkspaceFromYaml('id: abc\n')).toBe('');
  });
});

describe('parseCopilotFile', () => {
  it('parses a real-shaped usage_checkpoint line into a UsageEvent', () => {
    const events = parseCopilotFile(REAL_SAMPLE_LINE, 'session-xyz', 'C:\\DEV\\Fabasoft_WS');
    expect(events).toEqual([
      {
        source: 'copilot',
        sessionId: 'session-xyz',
        timestamp: '2026-09-07T11:52:50.537Z',
        model: 'claude-sonnet-5',
        workspace: 'Fabasoft_WS',
        inputTokens: 32354,
        outputTokens: 0,
        cacheReadTokens: 17859,
        cacheWriteTokens: 14493,
        nanoAiu: 4002830000,
        premiumRequests: 1,
      },
    ]);
  });

  it('skips events that are not usage_checkpoint', () => {
    const line = JSON.stringify({ type: 'session.other_event', data: {} });
    expect(parseCopilotFile(line, 's1', 'ws')).toEqual([]);
  });

  it('skips malformed JSON lines without throwing', () => {
    expect(() => parseCopilotFile('{not json', 's1', 'ws')).not.toThrow();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd ai-usage-dashboard && npx vitest run test/copilotParser.test.ts`
Expected: FAIL with "Cannot find module '../src/logScanner/copilotParser'"

- [x] **Step 3: Implement**

```ts
// ai-usage-dashboard/src/logScanner/copilotParser.ts
import { UsageEvent } from './types';
import { normalizeWorkspace } from './workspaceNormalize';

export function extractWorkspaceFromYaml(yamlContent: string): string {
  let cwd: string | undefined;
  let gitRoot: string | undefined;
  for (const line of yamlContent.split('\n')) {
    const gitRootMatch = line.match(/^git_root:\s*(.+)$/);
    if (gitRootMatch) {
      gitRoot = gitRootMatch[1].trim();
    }
    const cwdMatch = line.match(/^cwd:\s*(.+)$/);
    if (cwdMatch) {
      cwd = cwdMatch[1].trim();
    }
  }
  return gitRoot ?? cwd ?? '';
}

export function parseCopilotLine(
  line: string,
  sessionId: string,
  workspaceRaw: string
): UsageEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  let record: any;
  try {
    record = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (record.type !== 'session.usage_checkpoint' || !record.data || !record.timestamp) {
    return null;
  }
  const data = record.data;
  let model: string = data.lastActiveModel ?? 'unknown';
  let promptTokens = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  const breakState = data.promptCacheBreakState;
  if (Array.isArray(breakState)) {
    for (const conv of breakState) {
      const models = conv.models ?? {};
      for (const key of Object.keys(models)) {
        const m = models[key];
        model = m.model ?? model;
        promptTokens += m.prompt_tokens ?? 0;
        cacheRead += m.cache_read ?? 0;
        cacheWrite += m.cache_write ?? 0;
      }
    }
  }
  return {
    source: 'copilot',
    sessionId,
    timestamp: record.timestamp,
    model,
    workspace: normalizeWorkspace(workspaceRaw),
    inputTokens: promptTokens,
    outputTokens: 0,
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    nanoAiu: data.totalNanoAiu ?? 0,
    premiumRequests: data.totalPremiumRequests ?? 0,
  };
}

export function parseCopilotFile(
  content: string,
  sessionId: string,
  workspaceRaw: string
): UsageEvent[] {
  return content
    .split('\n')
    .map((line) => parseCopilotLine(line, sessionId, workspaceRaw))
    .filter((e): e is UsageEvent => e !== null);
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd ai-usage-dashboard && npx vitest run test/copilotParser.test.ts`
Expected: PASS (6/6)

- [x] **Step 5: Commit**

```bash
git add ai-usage-dashboard/src/logScanner/copilotParser.ts ai-usage-dashboard/test/copilotParser.test.ts
git commit -m "ai-usage-dashboard: add Copilot log parser + workspace.yaml extraction"
```

---

### Task 5: Incremental scan cache primitive

**Files:**
- Create: `ai-usage-dashboard/src/logScanner/scanCache.ts`
- Test: `ai-usage-dashboard/test/scanCache.test.ts`

**Does NOT cover:** concurrent writers appending mid-read (a scan reads whatever bytes `size()` reported at call time — a line partially written at the exact moment of scan may parse as malformed JSON, which the parsers already skip and will pick up correctly on the *next* scan once the line is complete).

- [x] **Step 1: Write failing test**

```ts
// ai-usage-dashboard/test/scanCache.test.ts
import { describe, it, expect } from 'vitest';
import { scanFile, ScanCache, FileSystemLike } from '../src/logScanner/scanCache';

function makeFakeFs(files: Record<string, string>): FileSystemLike {
  return {
    readFileSlice: (filePath, startByte) => files[filePath].slice(startByte),
    statMtimeMs: () => 1,
    size: (filePath) => files[filePath].length,
  };
}

describe('scanFile', () => {
  it('reads the whole file on first scan (empty cache)', () => {
    const fs = makeFakeFs({ '/a.jsonl': 'line1\nline2\n' });
    const { newContent, cache } = scanFile(fs, '/a.jsonl', {});
    expect(newContent).toBe('line1\nline2\n');
    expect(cache['/a.jsonl'].lastByteOffset).toBe(12);
  });

  it('reads only bytes appended since the last scan', () => {
    const fs = makeFakeFs({ '/a.jsonl': 'line1\nline2\n' });
    const priorCache: ScanCache = { '/a.jsonl': { lastByteOffset: 6, mtimeMs: 1 } };
    const { newContent } = scanFile(fs, '/a.jsonl', priorCache);
    expect(newContent).toBe('line2\n');
  });

  it('returns empty string when nothing new was appended', () => {
    const fs = makeFakeFs({ '/a.jsonl': 'line1\n' });
    const priorCache: ScanCache = { '/a.jsonl': { lastByteOffset: 6, mtimeMs: 1 } };
    const { newContent } = scanFile(fs, '/a.jsonl', priorCache);
    expect(newContent).toBe('');
  });

  it('rescans from byte 0 when the file shrank (rotation/truncation)', () => {
    const fs = makeFakeFs({ '/a.jsonl': 'short\n' });
    const priorCache: ScanCache = { '/a.jsonl': { lastByteOffset: 999, mtimeMs: 1 } };
    const { newContent } = scanFile(fs, '/a.jsonl', priorCache);
    expect(newContent).toBe('short\n');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd ai-usage-dashboard && npx vitest run test/scanCache.test.ts`
Expected: FAIL with "Cannot find module '../src/logScanner/scanCache'"

- [x] **Step 3: Implement**

```ts
// ai-usage-dashboard/src/logScanner/scanCache.ts
export interface FileCacheEntry {
  lastByteOffset: number;
  mtimeMs: number;
}

export interface ScanCache {
  [filePath: string]: FileCacheEntry;
}

export interface FileSystemLike {
  readFileSlice(filePath: string, startByte: number): string;
  statMtimeMs(filePath: string): number;
  size(filePath: string): number;
}

export function scanFile(
  fs: FileSystemLike,
  filePath: string,
  cache: ScanCache
): { newContent: string; cache: ScanCache } {
  const mtimeMs = fs.statMtimeMs(filePath);
  const fileSize = fs.size(filePath);
  const prior = cache[filePath];
  const priorOffset = prior?.lastByteOffset ?? 0;
  const startByte = priorOffset > fileSize ? 0 : priorOffset;
  const newContent = fs.readFileSlice(filePath, startByte);
  const updatedCache: ScanCache = {
    ...cache,
    [filePath]: { lastByteOffset: fileSize, mtimeMs },
  };
  return { newContent, cache: updatedCache };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd ai-usage-dashboard && npx vitest run test/scanCache.test.ts`
Expected: PASS (4/4)

- [x] **Step 5: Commit**

```bash
git add ai-usage-dashboard/src/logScanner/scanCache.ts ai-usage-dashboard/test/scanCache.test.ts
git commit -m "ai-usage-dashboard: add incremental byte-offset scan cache"
```

---

### Task 6: Log repository (real filesystem orchestration)

**Files:**
- Create: `ai-usage-dashboard/src/logScanner/logRepository.ts`
- Test: `ai-usage-dashboard/test/logRepository.test.ts`

**Does NOT cover:** the extension-host-specific persistence of `ScanCache` across VS Code restarts — that wiring (reading/writing `context.globalState`) is added in Task 8. This task's `scanAll` takes a `ScanCache` in and returns a new one out; persisting it is the caller's job.

- [x] **Step 1: Write failing test**

```ts
// ai-usage-dashboard/test/logRepository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanAll } from '../src/logScanner/logRepository';

let tmpRoot: string;
let claudeRoot: string;
let copilotRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-usage-test-'));
  claudeRoot = path.join(tmpRoot, 'claude-projects');
  copilotRoot = path.join(tmpRoot, 'copilot-sessions');
  fs.mkdirSync(claudeRoot, { recursive: true });
  fs.mkdirSync(copilotRoot, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('scanAll', () => {
  it('finds and parses Claude Code jsonl files under nested project dirs', () => {
    const projectDir = path.join(claudeRoot, 'c--DEV-Fabasoft-WS');
    fs.mkdirSync(projectDir, { recursive: true });
    const line = JSON.stringify({
      message: { model: 'claude-sonnet-5', usage: { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
      timestamp: '2026-09-10T00:00:00.000Z',
      cwd: 'c:\\DEV\\Fabasoft_WS',
    });
    fs.writeFileSync(path.join(projectDir, 'session1.jsonl'), line + '\n');

    const result = scanAll(claudeRoot, copilotRoot, {});
    expect(result.events).toHaveLength(1);
    expect(result.events[0].source).toBe('claude-code');
    expect(result.events[0].sessionId).toBe('session1');
    expect(result.events[0].workspace).toBe('Fabasoft_WS');
  });

  it('finds and parses Copilot session dirs with workspace.yaml + events.jsonl', () => {
    const sessionDir = path.join(copilotRoot, '012a299b-844e-4492-b5a2-d47368a45f38');
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(
      path.join(sessionDir, 'workspace.yaml'),
      'git_root: C:\\DEV\\Fabasoft_WS\ncwd: C:\\DEV\\Fabasoft_WS\n'
    );
    const line = JSON.stringify({
      type: 'session.usage_checkpoint',
      data: { totalNanoAiu: 100, totalPremiumRequests: 1, lastActiveModel: 'claude-sonnet-5' },
      timestamp: '2026-09-07T00:00:00.000Z',
    });
    fs.writeFileSync(path.join(sessionDir, 'events.jsonl'), line + '\n');

    const result = scanAll(claudeRoot, copilotRoot, {});
    expect(result.events).toHaveLength(1);
    expect(result.events[0].source).toBe('copilot');
    expect(result.events[0].sessionId).toBe('012a299b-844e-4492-b5a2-d47368a45f38');
    expect(result.events[0].workspace).toBe('Fabasoft_WS');
  });

  it('returns empty events and does not throw when both roots are missing', () => {
    const result = scanAll(
      path.join(tmpRoot, 'does-not-exist-1'),
      path.join(tmpRoot, 'does-not-exist-2'),
      {}
    );
    expect(result.events).toEqual([]);
  });

  it('only reads newly appended bytes on a second scan using the returned cache', () => {
    const projectDir = path.join(claudeRoot, 'ws1');
    fs.mkdirSync(projectDir, { recursive: true });
    const filePath = path.join(projectDir, 'session1.jsonl');
    const line = (n: number) =>
      JSON.stringify({
        message: { model: 'claude-sonnet-5', usage: { input_tokens: n, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
        timestamp: '2026-09-10T00:00:00.000Z',
        cwd: 'c:\\DEV\\ws1',
      });
    fs.writeFileSync(filePath, line(1) + '\n');

    const first = scanAll(claudeRoot, copilotRoot, {});
    expect(first.events).toHaveLength(1);

    fs.appendFileSync(filePath, line(2) + '\n');
    const second = scanAll(claudeRoot, copilotRoot, first.cache);
    expect(second.events).toHaveLength(1);
    expect(second.events[0].inputTokens).toBe(2);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd ai-usage-dashboard && npx vitest run test/logRepository.test.ts`
Expected: FAIL with "Cannot find module '../src/logScanner/logRepository'"

- [x] **Step 3: Implement**

```ts
// ai-usage-dashboard/src/logScanner/logRepository.ts
import * as fs from 'fs';
import * as path from 'path';
import { UsageEvent } from './types';
import { parseClaudeCodeFile } from './claudeCodeParser';
import { parseCopilotFile, extractWorkspaceFromYaml } from './copilotParser';
import { scanFile, ScanCache, FileSystemLike } from './scanCache';

const realFs: FileSystemLike = {
  readFileSlice: (filePath, startByte) => {
    const fd = fs.openSync(filePath, 'r');
    try {
      const size = fs.fstatSync(fd).size;
      const length = Math.max(0, size - startByte);
      const buffer = Buffer.alloc(length);
      if (length > 0) {
        fs.readSync(fd, buffer, 0, length, startByte);
      }
      return buffer.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  },
  statMtimeMs: (filePath) => fs.statSync(filePath).mtimeMs,
  size: (filePath) => fs.statSync(filePath).size,
};

function findFilesRecursive(root: string, matcher: (name: string) => boolean): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }
  const results: string[] = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFilesRecursive(fullPath, matcher));
    } else if (matcher(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function scanClaudeCode(claudeRoot: string, cache: ScanCache): { events: UsageEvent[]; cache: ScanCache } {
  const files = findFilesRecursive(claudeRoot, (name) => name.endsWith('.jsonl'));
  let events: UsageEvent[] = [];
  let nextCache = cache;
  for (const filePath of files) {
    const sessionId = path.basename(filePath, '.jsonl');
    const { newContent, cache: updatedCache } = scanFile(realFs, filePath, nextCache);
    nextCache = updatedCache;
    if (newContent) {
      events = events.concat(parseClaudeCodeFile(newContent, sessionId));
    }
  }
  return { events, cache: nextCache };
}

function scanCopilot(copilotRoot: string, cache: ScanCache): { events: UsageEvent[]; cache: ScanCache } {
  if (!fs.existsSync(copilotRoot)) {
    return { events: [], cache };
  }
  let events: UsageEvent[] = [];
  let nextCache = cache;
  const sessionDirs = fs.readdirSync(copilotRoot, { withFileTypes: true }).filter((e) => e.isDirectory());
  for (const dirEntry of sessionDirs) {
    const sessionId = dirEntry.name;
    const sessionDir = path.join(copilotRoot, sessionId);
    const eventsPath = path.join(sessionDir, 'events.jsonl');
    const workspaceYamlPath = path.join(sessionDir, 'workspace.yaml');
    if (!fs.existsSync(eventsPath)) {
      continue;
    }
    const workspaceRaw = fs.existsSync(workspaceYamlPath)
      ? extractWorkspaceFromYaml(fs.readFileSync(workspaceYamlPath, 'utf8'))
      : '';
    const { newContent, cache: updatedCache } = scanFile(realFs, eventsPath, nextCache);
    nextCache = updatedCache;
    if (newContent) {
      events = events.concat(parseCopilotFile(newContent, sessionId, workspaceRaw));
    }
  }
  return { events, cache: nextCache };
}

export function scanAll(
  claudeRoot: string,
  copilotRoot: string,
  cache: ScanCache
): { events: UsageEvent[]; cache: ScanCache } {
  const claudeResult = scanClaudeCode(claudeRoot, cache);
  const copilotResult = scanCopilot(copilotRoot, claudeResult.cache);
  return {
    events: claudeResult.events.concat(copilotResult.events),
    cache: copilotResult.cache,
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd ai-usage-dashboard && npx vitest run test/logRepository.test.ts`
Expected: PASS (4/4)

- [x] **Step 5: Commit**

```bash
git add ai-usage-dashboard/src/logScanner/logRepository.ts ai-usage-dashboard/test/logRepository.test.ts
git commit -m "ai-usage-dashboard: add real-filesystem log repository"
```

---

### Task 7: Aggregator (totals, grouping, time-bucketed series)

**Files:**
- Create: `ai-usage-dashboard/src/aggregator.ts`
- Test: `ai-usage-dashboard/test/aggregator.test.ts`

**Does NOT cover:** custom/arbitrary date ranges — only the three fixed ranges from the spec (`week` = 7 days, `month` = 30 days, `6months` = 180 days bucketed weekly) are supported; a caller wanting e.g. "last quarter" is out of scope for v1.

- [x] **Step 1: Write failing test**

```ts
// ai-usage-dashboard/test/aggregator.test.ts
import { describe, it, expect } from 'vitest';
import { UsageEvent } from '../src/logScanner/types';
import { computeTotals, groupByModel, groupByWorkspace, computeDailySeries } from '../src/aggregator';

function event(overrides: Partial<UsageEvent>): UsageEvent {
  return {
    source: 'claude-code',
    sessionId: 's1',
    timestamp: '2026-09-10T00:00:00.000Z',
    model: 'claude-sonnet-5',
    workspace: 'Fabasoft_WS',
    inputTokens: 10,
    outputTokens: 5,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    ...overrides,
  };
}

describe('computeTotals', () => {
  it('sums tokens and counts distinct sessions across sources', () => {
    const events = [
      event({ sessionId: 'a', inputTokens: 10, outputTokens: 5 }),
      event({ sessionId: 'a', inputTokens: 3, outputTokens: 1 }),
      event({ sessionId: 'b', source: 'copilot', inputTokens: 7, nanoAiu: 100, premiumRequests: 1 }),
    ];
    const totals = computeTotals(events);
    expect(totals.totalInputTokens).toBe(20);
    expect(totals.totalOutputTokens).toBe(6);
    expect(totals.totalNanoAiu).toBe(100);
    expect(totals.totalPremiumRequests).toBe(1);
    expect(totals.sessionCount).toBe(2);
  });
});

describe('groupByModel / groupByWorkspace', () => {
  it('groups and sums by model, sorted descending by total tokens', () => {
    const events = [
      event({ model: 'claude-haiku-4.5', inputTokens: 1, outputTokens: 1 }),
      event({ model: 'claude-sonnet-5', inputTokens: 50, outputTokens: 50 }),
    ];
    const grouped = groupByModel(events);
    expect(grouped[0].key).toBe('claude-sonnet-5');
    expect(grouped[0].inputTokens).toBe(50);
    expect(grouped[1].key).toBe('claude-haiku-4.5');
  });

  it('groups by workspace', () => {
    const events = [event({ workspace: 'WS_PSM' }), event({ workspace: 'Fabasoft_WS' })];
    const grouped = groupByWorkspace(events);
    expect(grouped.map((g) => g.key).sort()).toEqual(['Fabasoft_WS', 'WS_PSM']);
  });
});

describe('computeDailySeries', () => {
  const now = new Date('2026-09-16T12:00:00.000Z');

  it('buckets by day for the week range and excludes events outside it', () => {
    const events = [
      event({ timestamp: '2026-09-15T00:00:00.000Z' }),
      event({ timestamp: '2026-08-01T00:00:00.000Z' }), // outside 7-day window
    ];
    const series = computeDailySeries(events, 'week', now);
    expect(series).toHaveLength(1);
    expect(series[0].bucket).toBe('2026-09-15');
  });

  it('buckets by week for the 6months range', () => {
    const events = [event({ timestamp: '2026-08-10T00:00:00.000Z' })];
    const series = computeDailySeries(events, '6months', now);
    expect(series).toHaveLength(1);
    // Monday of the week containing 2026-08-10
    expect(series[0].bucket).toBe('2026-08-10');
  });

  it('counts distinct sessions per bucket', () => {
    const events = [
      event({ sessionId: 'a', timestamp: '2026-09-15T01:00:00.000Z' }),
      event({ sessionId: 'a', timestamp: '2026-09-15T02:00:00.000Z' }),
      event({ sessionId: 'b', timestamp: '2026-09-15T03:00:00.000Z' }),
    ];
    const series = computeDailySeries(events, 'week', now);
    expect(series[0].sessionCount).toBe(2);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd ai-usage-dashboard && npx vitest run test/aggregator.test.ts`
Expected: FAIL with "Cannot find module '../src/aggregator'"

- [x] **Step 3: Implement**

```ts
// ai-usage-dashboard/src/aggregator.ts
import { UsageEvent } from './logScanner/types';

export interface Totals {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  totalNanoAiu: number;
  totalPremiumRequests: number;
  sessionCount: number;
}

export function computeTotals(events: UsageEvent[]): Totals {
  const sessionIds = new Set<string>();
  const totals: Totals = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    totalNanoAiu: 0,
    totalPremiumRequests: 0,
    sessionCount: 0,
  };
  for (const e of events) {
    sessionIds.add(`${e.source}:${e.sessionId}`);
    totals.totalInputTokens += e.inputTokens;
    totals.totalOutputTokens += e.outputTokens;
    totals.totalCacheReadTokens += e.cacheReadTokens;
    totals.totalCacheWriteTokens += e.cacheWriteTokens;
    totals.totalNanoAiu += e.nanoAiu ?? 0;
    totals.totalPremiumRequests += e.premiumRequests ?? 0;
  }
  totals.sessionCount = sessionIds.size;
  return totals;
}

export interface GroupedTotal {
  key: string;
  inputTokens: number;
  outputTokens: number;
  nanoAiu: number;
}

function groupBy(events: UsageEvent[], keyFn: (e: UsageEvent) => string): GroupedTotal[] {
  const map = new Map<string, GroupedTotal>();
  for (const e of events) {
    const key = keyFn(e);
    const existing = map.get(key) ?? { key, inputTokens: 0, outputTokens: 0, nanoAiu: 0 };
    existing.inputTokens += e.inputTokens;
    existing.outputTokens += e.outputTokens;
    existing.nanoAiu += e.nanoAiu ?? 0;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens)
  );
}

export function groupByModel(events: UsageEvent[]): GroupedTotal[] {
  return groupBy(events, (e) => e.model);
}

export function groupByWorkspace(events: UsageEvent[]): GroupedTotal[] {
  return groupBy(events, (e) => e.workspace);
}

export type TimeRange = 'week' | 'month' | '6months';

export interface DailyPoint {
  bucket: string; // ISO date (day start, UTC)
  inputTokens: number;
  outputTokens: number;
  sessionCount: number;
}

function dayISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekStartISO(d: Date): string {
  const copy = new Date(d);
  const day = copy.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  copy.setUTCDate(copy.getUTCDate() - diff);
  return dayISO(copy);
}

export function computeDailySeries(
  events: UsageEvent[],
  range: TimeRange,
  now: Date = new Date()
): DailyPoint[] {
  const rangeDays = range === 'week' ? 7 : range === 'month' ? 30 : 180;
  const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const bucketByWeek = range === '6months';
  const bucketed = new Map<string, { inputTokens: number; outputTokens: number; sessionIds: Set<string> }>();

  for (const e of events) {
    const ts = new Date(e.timestamp);
    if (ts < cutoff || ts > now) {
      continue;
    }
    const bucketKey = bucketByWeek ? weekStartISO(ts) : dayISO(ts);
    const entry = bucketed.get(bucketKey) ?? { inputTokens: 0, outputTokens: 0, sessionIds: new Set<string>() };
    entry.inputTokens += e.inputTokens;
    entry.outputTokens += e.outputTokens;
    entry.sessionIds.add(`${e.source}:${e.sessionId}`);
    bucketed.set(bucketKey, entry);
  }

  return Array.from(bucketed.entries())
    .map(([bucket, v]) => ({
      bucket,
      inputTokens: v.inputTokens,
      outputTokens: v.outputTokens,
      sessionCount: v.sessionIds.size,
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd ai-usage-dashboard && npx vitest run test/aggregator.test.ts`
Expected: PASS (7/7)

- [x] **Step 5: Commit**

```bash
git add ai-usage-dashboard/src/aggregator.ts ai-usage-dashboard/test/aggregator.test.ts
git commit -m "ai-usage-dashboard: add totals/grouping/time-series aggregator"
```

---

### Task 8: Copilot allowance resolver (auto-fetch + manual fallback)

**Files:**
- Create: `ai-usage-dashboard/src/copilotAllowance.ts`
- Test: `ai-usage-dashboard/test/copilotAllowance.test.ts`

**Does NOT cover:** the real network call and real `vscode.authentication.getSession` — those are injected as `deps` here and wired to the actual VS Code/GitHub APIs in Task 9. This task only covers the fallback *logic* (auto succeeds / auto fails+manual set / auto fails+no manual / no token at all).

- [x] **Step 1: Write failing test**

```ts
// ai-usage-dashboard/test/copilotAllowance.test.ts
import { describe, it, expect, vi } from 'vitest';
import { resolveAllowance } from '../src/copilotAllowance';

describe('resolveAllowance', () => {
  it('returns auto-fetched allowance when the endpoint succeeds', async () => {
    const result = await resolveAllowance({
      getGithubToken: async () => 'tok',
      fetchAllowance: async () => ({ used: 3633.2, total: 30000 }),
      manualAllowance: undefined,
    });
    expect(result).toEqual({ used: 3633.2, total: 30000, source: 'auto' });
  });

  it('falls back to manual allowance when the fetch throws', async () => {
    const result = await resolveAllowance({
      getGithubToken: async () => 'tok',
      fetchAllowance: async () => {
        throw new Error('404');
      },
      manualAllowance: 30000,
    });
    expect(result).toEqual({ used: 0, total: 30000, source: 'manual' });
  });

  it('returns undefined when auto fails and no manual value is set', async () => {
    const result = await resolveAllowance({
      getGithubToken: async () => 'tok',
      fetchAllowance: async () => undefined,
      manualAllowance: undefined,
    });
    expect(result).toBeUndefined();
  });

  it('falls back to manual when no GitHub token is available', async () => {
    const result = await resolveAllowance({
      getGithubToken: async () => undefined,
      fetchAllowance: vi.fn(),
      manualAllowance: 25000,
    });
    expect(result).toEqual({ used: 0, total: 25000, source: 'manual' });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd ai-usage-dashboard && npx vitest run test/copilotAllowance.test.ts`
Expected: FAIL with "Cannot find module '../src/copilotAllowance'"

- [x] **Step 3: Implement**

```ts
// ai-usage-dashboard/src/copilotAllowance.ts
export interface AllowanceResult {
  used: number;
  total: number;
  source: 'auto' | 'manual';
}

export interface AllowanceFetchDeps {
  getGithubToken: () => Promise<string | undefined>;
  fetchAllowance: (token: string) => Promise<{ used: number; total: number } | undefined>;
  manualAllowance: number | undefined;
}

export async function resolveAllowance(deps: AllowanceFetchDeps): Promise<AllowanceResult | undefined> {
  const token = await deps.getGithubToken();
  if (token) {
    try {
      const result = await deps.fetchAllowance(token);
      if (result) {
        return { used: result.used, total: result.total, source: 'auto' };
      }
    } catch {
      // fall through to manual
    }
  }
  if (deps.manualAllowance !== undefined) {
    return { used: 0, total: deps.manualAllowance, source: 'manual' };
  }
  return undefined;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd ai-usage-dashboard && npx vitest run test/copilotAllowance.test.ts`
Expected: PASS (4/4)

- [x] **Step 5: Commit**

```bash
git add ai-usage-dashboard/src/copilotAllowance.ts ai-usage-dashboard/test/copilotAllowance.test.ts
git commit -m "ai-usage-dashboard: add Copilot allowance resolver with manual fallback"
```

---

### Task 9: Extension activation, commands, settings, globalState wiring

**Files:**
- Create: `ai-usage-dashboard/src/extension.ts`
- Modify: `ai-usage-dashboard/package.json` (add `activationEvents`, `contributes.commands`, `contributes.configuration`)

**Does NOT cover:** unit tests — this file imports `vscode`, which only exists inside the Extension Development Host. Verified manually in Task 12.

- [x] **Step 1: Add `contributes` and real activation events to `package.json`**

Replace the `"activationEvents": []` line and add a `contributes` block:

```json
  "activationEvents": ["onCommand:aiUsage.open"],
  "contributes": {
    "commands": [
      { "command": "aiUsage.open", "title": "AI Usage: Open Dashboard" },
      { "command": "aiUsage.refresh", "title": "AI Usage: Refresh Now" }
    ],
    "configuration": {
      "title": "AI Usage Dashboard",
      "properties": {
        "aiUsage.copilotMonthlyAllowance": {
          "type": "number",
          "default": null,
          "description": "Manual fallback for Copilot monthly credit allowance, used only if the automatic GitHub session lookup fails."
        },
        "aiUsage.autoRefreshMinutes": {
          "type": "number",
          "default": 0,
          "description": "Minutes between automatic dashboard refreshes. 0 disables auto-refresh."
        },
        "aiUsage.claudeLogsPath": {
          "type": "string",
          "default": "",
          "description": "Override for the Claude Code logs directory. Empty uses the default ~/.claude/projects."
        },
        "aiUsage.copilotLogsPath": {
          "type": "string",
          "default": "",
          "description": "Override for the Copilot session-state directory. Empty uses the default ~/.copilot/session-state."
        }
      }
    }
  },
```

- [x] **Step 2: Implement `src/extension.ts`**

```ts
// ai-usage-dashboard/src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { scanAll } from './logScanner/logRepository';
import { ScanCache } from './logScanner/scanCache';
import { computeTotals, groupByModel, groupByWorkspace, computeDailySeries, TimeRange } from './aggregator';
import { resolveAllowance } from './copilotAllowance';
import { createOrShowPanel, postDashboardData } from './webviewPanel';

const SCAN_CACHE_KEY = 'aiUsage.scanCache';
let scanCacheMemo: ScanCache = {};

function resolveDefaultPath(configuredOverride: string, defaultRelativeToHome: string): string {
  return configuredOverride && configuredOverride.trim().length > 0
    ? configuredOverride
    : path.join(os.homedir(), ...defaultRelativeToHome.split('/'));
}

async function refreshAndRender(context: vscode.ExtensionContext, range: TimeRange) {
  const config = vscode.workspace.getConfiguration('aiUsage');
  const claudeRoot = resolveDefaultPath(config.get<string>('claudeLogsPath', ''), '.claude/projects');
  const copilotRoot = resolveDefaultPath(config.get<string>('copilotLogsPath', ''), '.copilot/session-state');

  const priorCache = context.globalState.get<ScanCache>(SCAN_CACHE_KEY, scanCacheMemo);
  const { events, cache } = scanAll(claudeRoot, copilotRoot, priorCache);
  scanCacheMemo = cache;
  await context.globalState.update(SCAN_CACHE_KEY, cache);

  const manualAllowance = config.get<number | null>('copilotMonthlyAllowance', null);
  const allowance = await resolveAllowance({
    getGithubToken: async () => {
      const session = await vscode.authentication.getSession('github', ['read:user'], { createIfNone: false });
      return session?.accessToken;
    },
    fetchAllowance: async () => {
      // Exact endpoint TBD (see spec's Interfaces section) — returning undefined
      // triggers the manual-allowance fallback until this is filled in.
      return undefined;
    },
    manualAllowance: manualAllowance ?? undefined,
  });

  postDashboardData(context, {
    totals: computeTotals(events),
    byModel: groupByModel(events),
    byWorkspace: groupByWorkspace(events),
    dailySeries: computeDailySeries(events, range),
    range,
    allowance,
  });
}

export function activate(context: vscode.ExtensionContext) {
  scanCacheMemo = context.globalState.get<ScanCache>(SCAN_CACHE_KEY, {});

  context.subscriptions.push(
    vscode.commands.registerCommand('aiUsage.open', async () => {
      createOrShowPanel(context, async (range: TimeRange) => {
        await refreshAndRender(context, range);
      });
      await refreshAndRender(context, 'month');
    }),
    vscode.commands.registerCommand('aiUsage.refresh', async () => {
      await refreshAndRender(context, 'month');
    })
  );

  const autoRefreshMinutes = vscode.workspace.getConfiguration('aiUsage').get<number>('autoRefreshMinutes', 0);
  if (autoRefreshMinutes > 0) {
    const intervalMs = autoRefreshMinutes * 60 * 1000;
    const timer = setInterval(() => {
      refreshAndRender(context, 'month');
    }, intervalMs);
    context.subscriptions.push({ dispose: () => clearInterval(timer) });
  }
}

export function deactivate() {
  // No explicit teardown needed — subscriptions handle disposal.
}
```

- [x] **Step 3: Compile to catch type errors**

Run: `cd ai-usage-dashboard && npm run compile`
Expected: fails initially with "Cannot find module './webviewPanel'" — expected, resolved by Task 10. Do not treat this as a task failure; proceed to Task 10 before the final compile check.

- [x] **Step 4: Commit**

```bash
git add ai-usage-dashboard/src/extension.ts ai-usage-dashboard/package.json
git commit -m "ai-usage-dashboard: wire extension activation, commands, settings"
```

---

### Task 10: Webview panel + message protocol

**Files:**
- Create: `ai-usage-dashboard/src/webviewPanel.ts`

**Does NOT cover:** unit tests (requires `vscode.window.createWebviewPanel`, host-only API). Verified manually in Task 12.

- [x] **Step 1: Implement `src/webviewPanel.ts`**

```ts
// ai-usage-dashboard/src/webviewPanel.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Totals, GroupedTotal, DailyPoint, TimeRange } from './aggregator';
import { AllowanceResult } from './copilotAllowance';

export interface DashboardData {
  totals: Totals;
  byModel: GroupedTotal[];
  byWorkspace: GroupedTotal[];
  dailySeries: DailyPoint[];
  range: TimeRange;
  allowance: AllowanceResult | undefined;
}

let currentPanel: vscode.WebviewPanel | undefined;

export function createOrShowPanel(
  context: vscode.ExtensionContext,
  onRangeChange: (range: TimeRange) => void
): vscode.WebviewPanel {
  if (currentPanel) {
    currentPanel.reveal();
    return currentPanel;
  }

  const panel = vscode.window.createWebviewPanel(
    'aiUsageDashboard',
    'AI Usage Dashboard',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))],
      retainContextWhenHidden: true,
    }
  );

  const mediaRoot = path.join(context.extensionPath, 'media');
  const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaRoot, 'main.js')));
  const chartUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaRoot, 'vendor', 'chart.umd.min.js')));
  const cssUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaRoot, 'main.css')));
  const htmlTemplatePath = path.join(mediaRoot, 'index.html');

  let html = fs.readFileSync(htmlTemplatePath, 'utf8');
  html = html
    .replace('{{cspSource}}', panel.webview.cspSource)
    .replace('{{cssUri}}', cssUri.toString())
    .replace('{{chartUri}}', chartUri.toString())
    .replace('{{scriptUri}}', scriptUri.toString());
  panel.webview.html = html;

  panel.webview.onDidReceiveMessage((message) => {
    if (message?.type === 'rangeChange') {
      onRangeChange(message.range as TimeRange);
    }
  });

  panel.onDidDispose(() => {
    currentPanel = undefined;
  });

  currentPanel = panel;
  return panel;
}

export function postDashboardData(context: vscode.ExtensionContext, data: DashboardData) {
  if (currentPanel) {
    currentPanel.webview.postMessage({ type: 'dashboardData', data });
  }
}
```

- [x] **Step 2: Create `media/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src {{cspSource}}; script-src {{cspSource}};"
  />
  <link rel="stylesheet" href="{{cssUri}}" />
  <title>AI Usage Dashboard</title>
</head>
<body>
  <div id="app">
    <header class="toolbar">
      <h1>AI Usage Dashboard</h1>
      <div class="range-toggle" id="rangeToggle">
        <button data-range="week">Week</button>
        <button data-range="month" class="active">Month</button>
        <button data-range="6months">6 Months</button>
      </div>
    </header>
    <section class="stat-tiles" id="statTiles"></section>
    <section class="chart-row">
      <div class="chart-card">
        <h2>Daily Usage</h2>
        <canvas id="dailyChart"></canvas>
      </div>
    </section>
    <section class="chart-row">
      <div class="chart-card">
        <h2>Cost by Model</h2>
        <canvas id="modelChart"></canvas>
      </div>
      <div class="chart-card">
        <h2>Cost by Workspace</h2>
        <canvas id="workspaceChart"></canvas>
      </div>
    </section>
  </div>
  <script src="{{chartUri}}"></script>
  <script src="{{scriptUri}}"></script>
</body>
</html>
```

- [x] **Step 3: Commit**

```bash
git add ai-usage-dashboard/src/webviewPanel.ts ai-usage-dashboard/media/index.html
git commit -m "ai-usage-dashboard: add webview panel + HTML shell"
```

---

### Task 11: Chart.js client rendering + fluid styling + time-range toggle

**Files:**
- Create: `ai-usage-dashboard/media/main.css`
- Create: `ai-usage-dashboard/media/main.js`
- Create: `ai-usage-dashboard/media/vendor/chart.umd.min.js` (vendored, see Step 1)

**Does NOT cover:** automated tests — this is a plain-script webview client with no test harness in this plan; correctness is verified manually in Task 12 against real data.

- [x] **Step 1: Vendor Chart.js**

Run: `cd ai-usage-dashboard && mkdir -p media/vendor && curl -sL https://unpkg.com/chart.js@4/dist/chart.umd.min.js -o media/vendor/chart.umd.min.js`
Expected: `media/vendor/chart.umd.min.js` exists and is non-empty (this is a one-time local vendoring step, not a runtime CDN dependency — the file ships inside the extension and the webview loads it from disk via `localResourceRoots`)

- [x] **Step 2: Create `media/main.css`**

```css
body {
  font-family: var(--vscode-font-family);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  margin: 0;
  padding: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.range-toggle button {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none;
  padding: 4px 10px;
  cursor: pointer;
}

.range-toggle button.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.stat-tiles {
  display: flex;
  gap: 12px;
  margin: 16px 0;
  flex-wrap: wrap;
}

.stat-tile {
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 6px;
  padding: 12px 16px;
  min-width: 140px;
}

.stat-tile .value {
  font-size: 1.4em;
  font-weight: 600;
}

.chart-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.chart-card {
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 6px;
  padding: 12px;
  flex: 1;
  min-width: 320px;
}
```

- [x] **Step 3: Create `media/main.js`**

```js
// ai-usage-dashboard/media/main.js
(function () {
  const vscode = acquireVsCodeApi();
  let dailyChart;
  let modelChart;
  let workspaceChart;
  let currentRange = 'month';

  const FLUID_ANIMATION = { duration: 750, easing: 'easeOutQuart' };

  function fmt(n) {
    return new Intl.NumberFormat().format(Math.round(n));
  }

  function renderStatTiles(totals, allowance) {
    const el = document.getElementById('statTiles');
    const tiles = [
      { label: 'Input Tokens', value: fmt(totals.totalInputTokens) },
      { label: 'Output Tokens', value: fmt(totals.totalOutputTokens) },
      { label: 'Sessions', value: fmt(totals.sessionCount) },
    ];
    if (allowance) {
      const pct = allowance.total > 0 ? Math.round((allowance.used / allowance.total) * 100) : 0;
      tiles.push({ label: `Copilot Allowance (${allowance.source})`, value: `${pct}%` });
    }
    el.innerHTML = tiles
      .map((t) => `<div class="stat-tile"><div class="label">${t.label}</div><div class="value">${t.value}</div></div>`)
      .join('');
  }

  function renderDailyChart(dailySeries) {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    const labels = dailySeries.map((p) => p.bucket);
    const inputData = dailySeries.map((p) => p.inputTokens);
    const outputData = dailySeries.map((p) => p.outputTokens);

    if (dailyChart) {
      dailyChart.data.labels = labels;
      dailyChart.data.datasets[0].data = inputData;
      dailyChart.data.datasets[1].data = outputData;
      dailyChart.update();
      return;
    }

    dailyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Input Tokens',
            data: inputData,
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(88, 166, 255, 0.15)',
            borderColor: 'rgba(88, 166, 255, 1)',
          },
          {
            label: 'Output Tokens',
            data: outputData,
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(163, 113, 247, 0.15)',
            borderColor: 'rgba(163, 113, 247, 1)',
          },
        ],
      },
      options: {
        animation: FLUID_ANIMATION,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  function renderModelChart(byModel) {
    const ctx = document.getElementById('modelChart').getContext('2d');
    const labels = byModel.map((g) => g.key);
    const data = byModel.map((g) => g.inputTokens + g.outputTokens);
    if (modelChart) {
      modelChart.data.labels = labels;
      modelChart.data.datasets[0].data = data;
      modelChart.update();
      return;
    }
    modelChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data }] },
      options: { animation: FLUID_ANIMATION, plugins: { legend: { position: 'bottom' } } },
    });
  }

  function renderWorkspaceChart(byWorkspace) {
    const ctx = document.getElementById('workspaceChart').getContext('2d');
    const labels = byWorkspace.map((g) => g.key);
    const data = byWorkspace.map((g) => g.inputTokens + g.outputTokens);
    if (workspaceChart) {
      workspaceChart.data.labels = labels;
      workspaceChart.data.datasets[0].data = data;
      workspaceChart.update();
      return;
    }
    workspaceChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Tokens', data }] },
      options: {
        animation: FLUID_ANIMATION,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
      },
    });
  }

  function render(data) {
    renderStatTiles(data.totals, data.allowance);
    renderDailyChart(data.dailySeries);
    renderModelChart(data.byModel);
    renderWorkspaceChart(data.byWorkspace);
  }

  document.getElementById('rangeToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-range]');
    if (!btn) return;
    currentRange = btn.getAttribute('data-range');
    document.querySelectorAll('.range-toggle button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    vscode.postMessage({ type: 'rangeChange', range: currentRange });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'dashboardData') {
      render(message.data);
    }
  });
})();
```

- [x] **Step 4: Compile the full extension**

Run: `cd ai-usage-dashboard && npm run compile`
Expected: exits 0, no TypeScript errors (this resolves the "Cannot find module './webviewPanel'" deferred from Task 9, since `webviewPanel.ts` now exists)

- [x] **Step 5: Run the full unit test suite**

Run: `cd ai-usage-dashboard && npm test`
Expected: PASS, all suites from Tasks 2–8 green (workspaceNormalize, claudeCodeParser, copilotParser, scanCache, logRepository, aggregator, copilotAllowance)

- [x] **Step 6: Commit**

```bash
git add ai-usage-dashboard/media/main.css ai-usage-dashboard/media/main.js ai-usage-dashboard/media/vendor/chart.umd.min.js
git commit -m "ai-usage-dashboard: add Chart.js rendering with fluid animation styling"
```

---

### Task 12: Manual end-to-end verification + packaging

**Files:** none created — verification and packaging only.

- [ ] **Step 1: Launch Extension Development Host**

Run: `cd ai-usage-dashboard && code .` then press F5 in VS Code (or run `npx @vscode/test-electron` equivalent launch config if preferred)
Expected: a new "Extension Development Host" window opens

- [ ] **Step 2: Run the command and inspect real data**

In the Extension Development Host, open Command Palette → "AI Usage: Open Dashboard"
Expected: panel opens, stat tiles show non-zero token counts, "Cost by Model" and "Cost by Workspace" charts render, daily chart shows a line for the current month

- [x] **Step 3: Spot-check numbers against raw logs**

Run: `grep -c '"usage"' ~/.claude/projects/c--DEV-Fabasoft-WS/*.jsonl | head -1`
Expected: a plausible count in the same order of magnitude as what the dashboard's Fabasoft_WS session activity suggests (exact match not expected since grep counts lines, dashboard counts distinct sessions — this is a sanity check, not an equality assertion)

- [ ] **Step 4: Verify the time-range toggle**

Click "Week", then "6 Months" in the dashboard UI
Expected: daily chart re-renders with fewer/more points respectively, active button style updates, no console errors in the webview devtools (Command Palette → "Developer: Open Webview Developer Tools")

- [ ] **Step 5: Verify graceful handling when a source is empty**

Temporarily set `aiUsage.claudeLogsPath` to a nonexistent path in settings, reload the dashboard
Expected: Claude Code-derived numbers drop to 0 / "No data found" styling, Copilot data still renders, no error dialog or extension crash

- [x] **Step 6: Package the extension**

Run: `cd ai-usage-dashboard && npx vsce package`
Expected: produces `ai-usage-dashboard-0.1.0.vsix` with exit code 0

- [x] **Step 7: Install and confirm it loads from the packaged VSIX**

Run: `code --install-extension ai-usage-dashboard/ai-usage-dashboard-0.1.0.vsix`
Expected: exits 0, "AI Usage: Open Dashboard" command appears in a normal (non-dev-host) VS Code window and opens the same dashboard

- [ ] **Step 8: Commit final state**

```bash
git add ai-usage-dashboard/
git commit -m "ai-usage-dashboard: v0.1.0 verified end-to-end and packaged"
```
