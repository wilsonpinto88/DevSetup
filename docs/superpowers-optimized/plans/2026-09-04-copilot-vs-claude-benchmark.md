# Copilot CLI vs Claude Code Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-optimized:subagent-driven-development (recommended) or superpowers-optimized:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repeatable benchmark harness that runs an identical 11-task suite through both Claude Code and GitHub Copilot CLI (both `claude-sonnet-5`) against a shared synthetic TypeScript sample project, and produces a comparison report.

**Architecture:** A git-tracked sample Express+TS API with seeded bugs/gaps (`sample-project/`), a JSON task list (`tasks/tasks.json`), PowerShell library scripts that reset the sample project, invoke each CLI non-interactively, and extract token/cache metrics from each CLI's own session logs (`lib/`), objective pass/fail check scripts (`lib/checks/`), and a driver (`run-benchmark.ps1`) that orchestrates dry-run/execute modes and writes `results/<timestamp>/report.md`.

**Tech Stack:** TypeScript (sample project) + Jest (its tests), PowerShell 7+ (all harness scripts), `claude` and `copilot` CLIs invoked as subprocesses.

**Assumptions:**
- Assumes `claude -p --output-format json --dangerously-skip-permissions` returns a single JSON object with `usage.input_tokens`, `usage.output_tokens`, `usage.cache_read_input_tokens`, `usage.cache_creation_input_tokens`, `total_cost_usd`, `session_id`, `num_turns` (confirmed via `claude --help`; exact field values not verified against a live real call in this planning pass -- will NOT work if the CLI's JSON schema differs, in which case Task 11 (smoke test) surfaces it as `metrics unavailable` per the extractor's own error-handling contract, not a silent wrong number).
- Assumes `copilot -p --allow-all-tools --model claude-sonnet-5` writes session events to `~/.copilot/session-state/<sessionId>/events.jsonl` including a `session.usage_checkpoint` event with `totalNanoAiu`/`totalPremiumRequests` (confirmed via direct inspection of a real prior session log) -- will NOT resolve exact per-call input/output token counts if `model.model_call_success` events don't carry a `usage` sub-object in the shape assumed; the extractor degrades to partial data with explicit `warnings` rather than fabricating zeros.
- Assumes both CLIs' `--resume`/`--session-id` flags compose the way their `--help` text describes for multi-turn tasks -- will NOT work if either CLI silently starts a fresh context on `--resume` instead of continuing it; Task 11's smoke test only exercises single-shot tasks, so this specific assumption is unverified until a real multi-turn run happens (flagged as an open risk, not blocking this plan).
- Assumes running `run-benchmark.ps1 -Execute` costs real money/credits on both platforms -- this plan's tasks stop at the smoke test (2 real calls, explicitly confirmed before running); the full 22-call paid run is a manual step the user triggers themselves afterward, not automated by plan execution.

---

## File Structure

```
Benchmarks/copilot-vs-claude/
  sample-project/
    package.json
    tsconfig.json
    jest.config.js
    .gitignore
    src/
      index.ts
      lib/
        db.ts
        pricing.ts
        rateLimiter.ts
        inventory.ts
        __tests__/
          inventory.test.ts
      routes/
        users.ts
        reports.ts
  tasks/
    tasks.json
  lib/
    reset-sample-project.ps1
    generate-synthetic-log.ps1
    invoke-claude.ps1
    invoke-copilot.ps1
    extract-claude-metrics.ps1
    extract-copilot-metrics.ps1
    checks/
      check-correctness.ps1
      check-graph-map.ps1
      check-test-generation.ps1
      check-code-review.ps1
  run-benchmark.ps1
  results/               # created at runtime, git-tracked per spec's Rollout Notes
```

---

### Task 1: Scaffold the sample project [x] DONE

**Files:**
- Create: `Benchmarks/copilot-vs-claude/sample-project/package.json`
- Create: `Benchmarks/copilot-vs-claude/sample-project/tsconfig.json`
- Create: `Benchmarks/copilot-vs-claude/sample-project/jest.config.js`
- Create: `Benchmarks/copilot-vs-claude/sample-project/.gitignore`
- Create: `Benchmarks/copilot-vs-claude/sample-project/src/lib/db.ts`
- Create: `Benchmarks/copilot-vs-claude/sample-project/src/lib/pricing.ts`
- Create: `Benchmarks/copilot-vs-claude/sample-project/src/lib/rateLimiter.ts`
- Create: `Benchmarks/copilot-vs-claude/sample-project/src/lib/inventory.ts`
- Create: `Benchmarks/copilot-vs-claude/sample-project/src/lib/__tests__/inventory.test.ts`
- Create: `Benchmarks/copilot-vs-claude/sample-project/src/routes/users.ts`
- Create: `Benchmarks/copilot-vs-claude/sample-project/src/routes/reports.ts`
- Create: `Benchmarks/copilot-vs-claude/sample-project/src/index.ts`

**Does NOT cover:** wiring `rateLimiter.ts` into `index.ts` (that's the target of the instruction-following benchmark task itself -- it must stay unwired at baseline) or fixing `rateLimiter.ts`'s seeded bug (that's the code-review task's target -- it must stay buggy at baseline).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "benchmark-sample-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "jest",
    "build": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `jest.config.js`**

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
};
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 5: Create `src/lib/db.ts`**

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Report {
  id: number;
  userId: number;
  title: string;
  amount: number;
}

const users: User[] = [
  { id: 1, name: "Ada Lovelace", email: "ada@example.com" },
  { id: 2, name: "Alan Turing", email: "alan@example.com" },
];

const reports: Report[] = [
  { id: 1, userId: 1, title: "Q1 Summary", amount: 1200 },
  { id: 2, userId: 2, title: "Q2 Summary", amount: 850 },
];

export function getUsers(): User[] {
  return users;
}

export function getUserById(id: number): User | undefined {
  return users.find((u) => u.id === id);
}

export function addUser(user: User): void {
  users.push(user);
}

export function getReportsByUserId(userId: number): Report[] {
  return reports.filter((r) => r.userId === userId);
}

export function getAllReports(): Report[] {
  return reports;
}
```

- [ ] **Step 6: Create `src/lib/pricing.ts`** (untested function -- target of the test-generation task; boundary tiers and negative-quantity behavior are the "seeded edge case" a good test suite should cover)

```typescript
export function calculateDiscount(price: number, quantity: number): number {
  let discountRate = 0;
  if (quantity >= 100) {
    discountRate = 0.2;
  } else if (quantity >= 50) {
    discountRate = 0.1;
  } else if (quantity >= 10) {
    discountRate = 0.05;
  }
  const total = price * quantity;
  return total - total * discountRate;
}
```

- [ ] **Step 7: Create `src/lib/rateLimiter.ts`** (seeded real bug -- target of the code-review task; NOT imported anywhere yet -- target of the instruction-following task)

```typescript
import { Request, Response, NextFunction } from "express";

interface RateLimiterOptions {
  limit: number;
  windowMs: number;
}

const requestLog = new Map<string, number[]>();

export function createRateLimiter(options: RateLimiterOptions) {
  const { limit, windowMs } = options;

  return function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < windowMs);

    // BUG: should be >= limit (reject once `limit` requests are already logged in the
    // window). Using > allows one extra request through before blocking.
    if (timestamps.length > limit) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    timestamps.push(now);
    requestLog.set(key, timestamps);
    next();
  };
}
```

- [ ] **Step 8: Create `src/lib/inventory.ts`** (unimplemented function -- target of the correctness task)

```typescript
export function reorderThreshold(currentStock: number, dailyDemand: number, leadTimeDays: number): number {
  // See src/lib/__tests__/inventory.test.ts for the exact spec.
  throw new Error("not implemented");
}
```

- [ ] **Step 9: Create `src/lib/__tests__/inventory.test.ts`** (pre-written, provided as-is -- this is the correctness task's objective check)

```typescript
import { reorderThreshold } from "../inventory";

describe("reorderThreshold", () => {
  it("returns demand during lead time when no safety stock is needed", () => {
    expect(reorderThreshold(100, 10, 5)).toBe(50);
  });

  it("returns 0 when daily demand is 0", () => {
    expect(reorderThreshold(100, 0, 5)).toBe(0);
  });

  it("scales linearly with lead time", () => {
    expect(reorderThreshold(200, 8, 10)).toBe(80);
  });
});
```

- [ ] **Step 10: Create `src/routes/users.ts`**

```typescript
import { Router } from "express";
import { getUsers, addUser, User } from "../lib/db";

const router = Router();

router.get("/", (req, res) => {
  res.json(getUsers());
});

router.post("/", (req, res) => {
  const { id, name, email } = req.body as User;
  if (!id || !name || !email) {
    res.status(400).json({ error: "id, name, and email are required" });
    return;
  }
  addUser({ id, name, email });
  res.status(201).json({ id, name, email });
});

export default router;
```

- [ ] **Step 11: Create `src/routes/reports.ts`** (messy/duplicated function -- target of the code-quality task, which adds a third near-identical endpoint)

```typescript
import { Router } from "express";
import { getReportsByUserId, getAllReports, getUserById } from "../lib/db";

const router = Router();

function formatUserReport(userId: number) {
  const user = getUserById(userId);
  const reports = getReportsByUserId(userId);
  const total = reports.reduce((sum, r) => sum + r.amount, 0);
  return {
    userName: user?.name ?? "Unknown",
    reportCount: reports.length,
    totalAmount: total,
    items: reports.map((r) => ({ title: r.title, amount: r.amount })),
  };
}

function formatAdminReport(userId: number) {
  const user = getUserById(userId);
  const reports = getReportsByUserId(userId);
  const total = reports.reduce((sum, r) => sum + r.amount, 0);
  return {
    userName: user?.name ?? "Unknown",
    reportCount: reports.length,
    totalAmount: total,
    items: reports.map((r) => ({ title: r.title, amount: r.amount })),
    isAdminView: true,
  };
}

router.get("/user/:id", (req, res) => {
  res.json(formatUserReport(Number(req.params.id)));
});

router.get("/admin/:id", (req, res) => {
  res.json(formatAdminReport(Number(req.params.id)));
});

router.get("/all", (req, res) => {
  res.json(getAllReports());
});

export default router;
```

- [ ] **Step 12: Create `src/index.ts`**

```typescript
import express from "express";
import usersRouter from "./routes/users";
import reportsRouter from "./routes/reports";

const app = express();
app.use(express.json());

app.use("/users", usersRouter);
app.use("/reports", reportsRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Sample API listening on port ${PORT}`);
});

export default app;
```

- [ ] **Step 13: Install dependencies and verify baseline**

Run: `cd Benchmarks/copilot-vs-claude/sample-project && npm install`
Expected: installs cleanly, `node_modules/` created.

Run: `npx tsc --noEmit`
Expected: PASS -- no type errors (including `inventory.ts`, since a function body that unconditionally throws satisfies any declared return type).

Run: `npm test`
Expected: FAIL -- the 3 `inventory.test.ts` tests fail because `reorderThreshold` throws "not implemented". This is the correct baseline (the correctness task's job is to make this pass).

- [ ] **Step 14: Commit**

```bash
git add Benchmarks/copilot-vs-claude/sample-project
git commit -m "$(cat <<'EOF'
Add sample TypeScript API for Copilot-vs-Claude benchmark

Small Express+TS API with three deliberately seeded gaps: an unwired
rate limiter with an off-by-one bug (code-review target), an untested
pricing function (test-generation target), and an unimplemented
inventory function with a pre-written failing test (correctness
target). Real import graph across 6 files for the graph-map task.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

### Task 2: Write the synthetic log generator [x] DONE

**Files:**
- Create: `Benchmarks/copilot-vs-claude/lib/generate-synthetic-log.ps1`

**Does NOT cover:** the context-management task definition itself (Task 3) -- this script only produces the log text that gets substituted into it.

- [ ] **Step 1: Create the generator script**

```powershell
$ErrorActionPreference = "Stop"

$ips = @("203.0.113.5", "203.0.113.9", "198.51.100.23", "198.51.100.42", "192.0.2.77")
$paths = @("/users", "/reports/all", "/reports/user/1", "/health", "/reports/admin/2")
$statuses5xx = @(500, 502, 503)
$statusesOther = @(200, 200, 200, 201, 304, 404)

$lines = New-Object System.Collections.Generic.List[string]
$start = Get-Date "2026-09-04 09:00:00"
for ($i = 0; $i -lt 250; $i++) {
    $ip = $ips | Get-Random
    $path = $paths | Get-Random
    # Bias one IP toward errors so the log has a real, checkable "top offender" signal.
    if ($ip -eq "198.51.100.42" -and (Get-Random -Minimum 0 -Maximum 100) -lt 40) {
        $status = $statuses5xx | Get-Random
    } else {
        $status = $statusesOther | Get-Random
    }
    $ts = $start.AddSeconds($i * 14).ToString("yyyy-MM-dd HH:mm:ss")
    $ms = Get-Random -Minimum 80 -Maximum 4200
    $lines.Add("$ts $ip GET $path HTTP/1.1 $status ${ms}ms")
}
$lines -join "`n"
```

- [ ] **Step 2: Verify output**

Run: `$log = & "Benchmarks\copilot-vs-claude\lib\generate-synthetic-log.ps1"; ($log -split "`n").Count`
Expected: `250`

Run: `($log -split "`n" | Select-String "198.51.100.42" | Select-String "50[023]").Count`
Expected: a number greater than 0 (confirms the biased-error IP actually produced some 5xx lines; exact count varies run to run since `Get-Random` is unseeded).

- [ ] **Step 3: Commit**

```bash
git add Benchmarks/copilot-vs-claude/lib/generate-synthetic-log.ps1
git commit -m "$(cat <<'EOF'
Add synthetic access-log generator for the context-management task

Produces 250 lines with one IP biased toward 5xx errors, giving the
context-management benchmark task a real, checkable signal (top
error-source IP, throttling analysis) rather than inert filler text.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

### Task 3: Write tasks.json [x] DONE

**Files:**
- Create: `Benchmarks/copilot-vs-claude/tasks/tasks.json`

**Does NOT cover:** the `{{SYNTHETIC_LOG}}` substitution mechanism -- that's implemented in `run-benchmark.ps1` (Task 9). This task only writes the placeholder into the context-management task's first turn.

- [ ] **Step 1: Create `tasks/tasks.json`**

```json
[
  {
    "id": "instruction-following",
    "dimension": "instruction-following",
    "mode": "single-shot",
    "prompt": "Add rate limiting to the API. There's already a createRateLimiter helper in src/lib/rateLimiter.ts that isn't wired into anything yet.",
    "objective_check": null,
    "notes": "Scored on whether the agent states its assumptions (which routes, what limit/window) vs silently guessing."
  },
  {
    "id": "correctness",
    "dimension": "correctness",
    "mode": "single-shot",
    "prompt": "Implement reorderThreshold in src/lib/inventory.ts so that `npm test` passes. The reorder threshold is daily demand multiplied by lead time in days (no safety stock). See src/lib/__tests__/inventory.test.ts for the exact expected values.",
    "objective_check": "check-correctness.ps1",
    "notes": "Fully specified -- pass/fail is deterministic."
  },
  {
    "id": "planning",
    "dimension": "planning",
    "mode": "single-shot",
    "prompt": "Write an implementation plan for adding pagination (limit/offset query params) to the GET /users and GET /reports/all endpoints. Do not write any code -- plan only.",
    "objective_check": null,
    "notes": "Rubric: steps identified, files identified, risks called out, test strategy present."
  },
  {
    "id": "brainstorming-organic",
    "dimension": "brainstorming",
    "mode": "single-shot",
    "prompt": "We're a small internal tool, not customer-facing yet. Should we add authentication to this API using session cookies or JWT?",
    "variant_of": "brainstorming",
    "objective_check": null,
    "notes": "Tests organic skill routing, not just execution quality."
  },
  {
    "id": "brainstorming-explicit",
    "dimension": "brainstorming",
    "mode": "single-shot",
    "prompt": "We're a small internal tool, not customer-facing yet. Should we add authentication to this API using session cookies or JWT? Use the brainstorming skill.",
    "variant_of": "brainstorming",
    "objective_check": null,
    "notes": "Explicit routing -- isolates execution quality from routing reliability."
  },
  {
    "id": "graph-map-organic",
    "dimension": "graph-map",
    "mode": "single-shot",
    "prompt": "Can you help me understand how this codebase is structured? I'm new to it.",
    "variant_of": "graph-map",
    "objective_check": "check-graph-map.ps1",
    "notes": "Tests organic skill routing, not just execution quality."
  },
  {
    "id": "graph-map-explicit",
    "dimension": "graph-map",
    "mode": "single-shot",
    "prompt": "Use the graph-map skill to map this project's structure.",
    "variant_of": "graph-map",
    "objective_check": "check-graph-map.ps1",
    "notes": "Explicit routing -- isolates execution quality from routing reliability."
  },
  {
    "id": "test-generation",
    "dimension": "test-generation",
    "mode": "single-shot",
    "prompt": "Write tests for calculateDiscount in src/lib/pricing.ts. It currently has no test coverage.",
    "objective_check": "check-test-generation.ps1",
    "notes": "Objective check requires coverage of the zero/negative-quantity edge case, not just the happy path."
  },
  {
    "id": "code-review",
    "dimension": "code-review",
    "mode": "single-shot",
    "prompt": "Please review this file before we merge it -- I want to make sure there are no bugs:\n\n```typescript\nimport { Request, Response, NextFunction } from \"express\";\n\ninterface RateLimiterOptions {\n  limit: number;\n  windowMs: number;\n}\n\nconst requestLog = new Map<string, number[]>();\n\nexport function createRateLimiter(options: RateLimiterOptions) {\n  const { limit, windowMs } = options;\n\n  return function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {\n    const key = req.ip ?? \"unknown\";\n    const now = Date.now();\n    const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < windowMs);\n\n    if (timestamps.length > limit) {\n      res.status(429).json({ error: \"Too many requests\" });\n      return;\n    }\n\n    timestamps.push(now);\n    requestLog.set(key, timestamps);\n    next();\n  };\n}\n```",
    "objective_check": "check-code-review.ps1",
    "notes": "Seeded bug: `> limit` should be `>= limit`, an off-by-one that lets one extra request through. Content is embedded inline rather than as a real git diff -- simpler harness, same review target."
  },
  {
    "id": "code-quality",
    "dimension": "code-quality",
    "mode": "single-shot",
    "prompt": "Add a GET /reports/summary endpoint to src/routes/reports.ts that returns { totalAmount: number, reportCount: number } computed across all reports.",
    "objective_check": null,
    "notes": "Rubric: does it reuse getAllReports() and avoid duplicating formatUserReport/formatAdminReport's pattern, or does it add a third near-identical function."
  },
  {
    "id": "context-management",
    "dimension": "context-management",
    "mode": "multi-turn",
    "turns": [
      "Here is our access log for the past hour. Read it and tell me if anything looks concerning:\n\n{{SYNTHETIC_LOG}}",
      "Which single client IP generated the most 5xx errors?",
      "If we set a rate limit of 100 requests per minute per IP, which client(s) from this log would have been throttled?",
      "Summarize your findings from this log in 3 bullet points for a teammate who hasn't seen it."
    ],
    "objective_check": null,
    "notes": "Rubric: does turn 4's summary stay accurate to turns 1-3, does the tool report/handle context compaction if it occurs."
  }
]
```

- [ ] **Step 2: Verify valid JSON and correct task count**

Run: `(Get-Content "Benchmarks\copilot-vs-claude\tasks\tasks.json" -Raw | ConvertFrom-Json).Count`
Expected: `11`

- [ ] **Step 3: Commit**

```bash
git add Benchmarks/copilot-vs-claude/tasks/tasks.json
git commit -m "$(cat <<'EOF'
Add 11-task benchmark suite definition

One task per dimension from the design spec; brainstorming and
graph-map each split into organic/explicit prompt variants to
separate skill-routing reliability from execution quality, since
Copilot's routing is instruction-based and known to be less
deterministic than Claude's.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

### Task 4: Write reset-sample-project.ps1 [x] DONE

**Files:**
- Create: `Benchmarks/copilot-vs-claude/lib/reset-sample-project.ps1`

- [ ] **Step 1: Create the script**

```powershell
$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
$sampleProjectRelative = "Benchmarks/copilot-vs-claude/sample-project"

Push-Location $repoRoot
try {
    git checkout -- $sampleProjectRelative
    git clean -fd -e node_modules -- $sampleProjectRelative
} finally {
    Pop-Location
}
```

- [ ] **Step 2: Verify it resets a dirty change**

Run:
```powershell
"// dirty test line" | Add-Content "Benchmarks\copilot-vs-claude\sample-project\src\index.ts"
New-Item -ItemType File -Path "Benchmarks\copilot-vs-claude\sample-project\src\untracked-test-file.ts" -Force | Out-Null
& "Benchmarks\copilot-vs-claude\lib\reset-sample-project.ps1"
git status --short -- Benchmarks/copilot-vs-claude/sample-project
```
Expected: empty output (no modified or untracked files reported for `sample-project/` -- both the dirty edit and the untracked file are gone).

- [ ] **Step 3: Commit**

```bash
git add Benchmarks/copilot-vs-claude/lib/reset-sample-project.ps1
git commit -m "$(cat <<'EOF'
Add sample-project reset script for the benchmark runner

Scoped git checkout + clean on just sample-project/, excluding
node_modules so npm install only needs to run once, not before
every task/agent run.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

### Task 5: Write invoke-claude.ps1 [x] DONE

**Files:**
- Create: `Benchmarks/copilot-vs-claude/lib/invoke-claude.ps1`

**Does NOT cover:** metrics extraction (Task 7) -- this script only runs the CLI and returns the contract object (`transcriptPath`, `exitCode`, `wallClockMs`, `sessionId`).

- [ ] **Step 1: Create the script**

```powershell
param(
    [Parameter(Mandatory)] [string[]]$Turns,
    [Parameter(Mandatory)] [string]$WorkingDir,
    [Parameter(Mandatory)] [string]$OutDir,
    [int]$TimeoutSec = 300
)
$ErrorActionPreference = "Stop"

$sessionId = [guid]::NewGuid().ToString()
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$transcriptPath = Join-Path $OutDir "transcript.txt"

$allOutput = New-Object System.Collections.Generic.List[string]
$exitCode = 0
$sw = [System.Diagnostics.Stopwatch]::StartNew()

for ($i = 0; $i -lt $Turns.Count; $i++) {
    $stdoutPath = Join-Path $OutDir "turn-$i-stdout.json"
    $stderrPath = Join-Path $OutDir "turn-$i-stderr.txt"

    $cliArgs = @(
        "-p", $Turns[$i],
        "--output-format", "json",
        "--dangerously-skip-permissions",
        "--model", "claude-sonnet-5"
    )
    if ($i -eq 0) {
        $cliArgs += @("--session-id", $sessionId)
    } else {
        $cliArgs += @("--resume", $sessionId)
    }

    Push-Location $WorkingDir
    try {
        $proc = Start-Process -FilePath "claude" -ArgumentList $cliArgs -NoNewWindow -PassThru `
            -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
        if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
            $proc.Kill()
            $exitCode = -1
            $allOutput.Add("TURN $i TIMEOUT after ${TimeoutSec}s")
            break
        }
        $exitCode = $proc.ExitCode
        $allOutput.Add((Get-Content $stdoutPath -Raw))
    } finally {
        Pop-Location
    }
}

$sw.Stop()
($allOutput -join "`n---TURN BOUNDARY---`n") | Out-File -FilePath $transcriptPath -Encoding utf8

[PSCustomObject]@{
    transcriptPath = $transcriptPath
    exitCode       = $exitCode
    wallClockMs    = $sw.ElapsedMilliseconds
    sessionId      = $sessionId
}
```

- [ ] **Step 2: Verify contract shape with a dry structural check** (does not invoke the real CLI, avoids real cost at this stage)

Run: `Get-Command "Benchmarks\copilot-vs-claude\lib\invoke-claude.ps1" | Select-Object -ExpandProperty Parameters | Select-Object -ExpandProperty Keys`
Expected: includes `Turns`, `WorkingDir`, `OutDir`, `TimeoutSec`.

- [ ] **Step 3: Commit**

```bash
git add Benchmarks/copilot-vs-claude/lib/invoke-claude.ps1
git commit -m "$(cat <<'EOF'
Add Claude Code CLI invocation wrapper for the benchmark runner

Wraps `claude -p --output-format json --dangerously-skip-permissions
--model claude-sonnet-5`, supporting multi-turn tasks via
--session-id/--resume. Never throws on non-zero exit -- that's a
task result, not a runner bug -- and always returns the
{transcriptPath, exitCode, wallClockMs, sessionId} contract.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

### Task 6: Write invoke-copilot.ps1 [x] DONE

**Files:**
- Create: `Benchmarks/copilot-vs-claude/lib/invoke-copilot.ps1`

- [ ] **Step 1: Create the script**

```powershell
param(
    [Parameter(Mandatory)] [string[]]$Turns,
    [Parameter(Mandatory)] [string]$WorkingDir,
    [Parameter(Mandatory)] [string]$OutDir,
    [int]$TimeoutSec = 300
)
$ErrorActionPreference = "Stop"

$sessionId = [guid]::NewGuid().ToString()
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$transcriptPath = Join-Path $OutDir "transcript.txt"

$allOutput = New-Object System.Collections.Generic.List[string]
$exitCode = 0
$sw = [System.Diagnostics.Stopwatch]::StartNew()

for ($i = 0; $i -lt $Turns.Count; $i++) {
    $stdoutPath = Join-Path $OutDir "turn-$i-stdout.txt"
    $stderrPath = Join-Path $OutDir "turn-$i-stderr.txt"

    $cliArgs = @(
        "-p", $Turns[$i],
        "--allow-all-tools",
        "--model", "claude-sonnet-5"
    )
    if ($i -eq 0) {
        $cliArgs += @("--session-id", $sessionId)
    } else {
        $cliArgs += @("--resume=$sessionId")
    }

    Push-Location $WorkingDir
    try {
        $proc = Start-Process -FilePath "copilot" -ArgumentList $cliArgs -NoNewWindow -PassThru `
            -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
        if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
            $proc.Kill()
            $exitCode = -1
            $allOutput.Add("TURN $i TIMEOUT after ${TimeoutSec}s")
            break
        }
        $exitCode = $proc.ExitCode
        $allOutput.Add((Get-Content $stdoutPath -Raw))
    } finally {
        Pop-Location
    }
}

$sw.Stop()
($allOutput -join "`n---TURN BOUNDARY---`n") | Out-File -FilePath $transcriptPath -Encoding utf8

[PSCustomObject]@{
    transcriptPath = $transcriptPath
    exitCode       = $exitCode
    wallClockMs    = $sw.ElapsedMilliseconds
    sessionId      = $sessionId
}
```

- [ ] **Step 2: Verify contract shape**

Run: `Get-Command "Benchmarks\copilot-vs-claude\lib\invoke-copilot.ps1" | Select-Object -ExpandProperty Parameters | Select-Object -ExpandProperty Keys`
Expected: includes `Turns`, `WorkingDir`, `OutDir`, `TimeoutSec`.

- [ ] **Step 3: Commit**

```bash
git add Benchmarks/copilot-vs-claude/lib/invoke-copilot.ps1
git commit -m "$(cat <<'EOF'
Add Copilot CLI invocation wrapper for the benchmark runner

Mirrors invoke-claude.ps1's contract exactly: wraps
`copilot -p --allow-all-tools --model claude-sonnet-5`, multi-turn
via --session-id/--resume=, same {transcriptPath, exitCode,
wallClockMs, sessionId} return shape so run-benchmark.ps1 can treat
both agents uniformly.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

### Task 7: Write extract-claude-metrics.ps1 [x] DONE

**Files:**
- Create: `Benchmarks/copilot-vs-claude/lib/extract-claude-metrics.ps1`

**Does NOT cover:** cases where the CLI's JSON schema has changed since this plan was written -- per the spec's error-handling contract, that surfaces as an `error` field, not a silently-wrong number.

- [ ] **Step 1: Create the script**

```powershell
param(
    [Parameter(Mandatory)] [string]$SessionId,
    [Parameter(Mandatory)] [string]$OutDir
)
$ErrorActionPreference = "Stop"

$turnFiles = Get-ChildItem -Path $OutDir -Filter "turn-*-stdout.json" -ErrorAction SilentlyContinue | Sort-Object Name
if (-not $turnFiles -or $turnFiles.Count -eq 0) {
    [PSCustomObject]@{ error = "metrics unavailable: no turn output files found in $OutDir" }
    return
}

$inputTokens = 0
$outputTokens = 0
$cacheReadTokens = 0
$cacheCreationTokens = 0
$estCost = 0.0
$raw = New-Object System.Collections.Generic.List[object]

foreach ($f in $turnFiles) {
    try {
        $json = Get-Content $f.FullName -Raw | ConvertFrom-Json
    } catch {
        [PSCustomObject]@{ error = "metrics unavailable: could not parse $($f.Name) as JSON" }
        return
    }
    $raw.Add($json)
    if (-not $json.usage) {
        [PSCustomObject]@{ error = "metrics unavailable: no 'usage' field in $($f.Name)" }
        return
    }
    $inputTokens         += [int]$json.usage.input_tokens
    $outputTokens        += [int]$json.usage.output_tokens
    $cacheReadTokens     += [int]($json.usage.cache_read_input_tokens ?? 0)
    $cacheCreationTokens += [int]($json.usage.cache_creation_input_tokens ?? 0)
    $estCost             += [double]($json.total_cost_usd ?? 0)
}

[PSCustomObject]@{
    inputTokens         = $inputTokens
    outputTokens        = $outputTokens
    cacheReadTokens     = $cacheReadTokens
    cacheCreationTokens = $cacheCreationTokens
    toolCallCount       = ($raw | ForEach-Object { $_.num_turns } | Measure-Object -Sum).Sum
    estCost             = $estCost
    costUnit            = "usd"
    raw                 = $raw
}
```

- [ ] **Step 2: Verify error path (no real CLI call needed)**

Run:
```powershell
$emptyDir = Join-Path $env:TEMP "extract-claude-metrics-test"
New-Item -ItemType Directory -Path $emptyDir -Force | Out-Null
$result = & "Benchmarks\copilot-vs-claude\lib\extract-claude-metrics.ps1" -SessionId "fake-session" -OutDir $emptyDir
$result.error
Remove-Item -Recurse -Force $emptyDir
```
Expected: prints a string starting with `metrics unavailable: no turn output files found`.

- [ ] **Step 3: Commit**

```bash
git add Benchmarks/copilot-vs-claude/lib/extract-claude-metrics.ps1
git commit -m "$(cat <<'EOF'
Add Claude Code metrics extractor

Parses --output-format json turn outputs into
{inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens,
toolCallCount, estCost, costUnit, raw}. Returns an explicit error
object on any missing/unparseable data rather than defaulting to
zero, per the design spec's error-handling contract.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

### Task 8: Write extract-copilot-metrics.ps1 [x] DONE

**Files:**
- Create: `Benchmarks/copilot-vs-claude/lib/extract-copilot-metrics.ps1`

**Does NOT cover:** converting `totalNanoAiu` into USD -- per the spec's non-goal, Copilot's AI-credit unit is reported as-is (`costUnit: "ai_credits"`), not normalized against Claude's `usd`.

- [ ] **Step 1: Create the script**

```powershell
param(
    [Parameter(Mandatory)] [string]$SessionId
)
$ErrorActionPreference = "Stop"

$logPath = Join-Path $env:USERPROFILE ".copilot\session-state\$SessionId\events.jsonl"
if (-not (Test-Path $logPath)) {
    [PSCustomObject]@{ error = "metrics unavailable: no session log found at $logPath" }
    return
}

$events = New-Object System.Collections.Generic.List[object]
foreach ($line in Get-Content $logPath) {
    try { $events.Add(($line | ConvertFrom-Json)) } catch { continue }
}
if ($events.Count -eq 0) {
    [PSCustomObject]@{ error = "metrics unavailable: session log at $logPath had no parseable JSON lines" }
    return
}

$checkpoints = $events | Where-Object { $_.type -eq "session.usage_checkpoint" }
if (-not $checkpoints -or $checkpoints.Count -eq 0) {
    [PSCustomObject]@{ error = "metrics unavailable: no session.usage_checkpoint events in $logPath" }
    return
}
$lastCheckpoint = $checkpoints[-1].data

$modelCalls = $events | Where-Object { $_.type -eq "model.model_call_success" }
$toolCallCount = ($events | Where-Object { $_.type -like "tool.*" }).Count

$warnings = New-Object System.Collections.Generic.List[string]
$inputTokens = $null
$outputTokens = $null
foreach ($call in $modelCalls) {
    $usage = $call.data.modelCall.usage
    if ($usage) {
        if ($null -eq $inputTokens) { $inputTokens = 0 }
        if ($null -eq $outputTokens) { $outputTokens = 0 }
        $inputTokens  += [int]($usage.prompt_tokens ?? $usage.input_tokens ?? 0)
        $outputTokens += [int]($usage.completion_tokens ?? $usage.output_tokens ?? 0)
    }
}
if ($null -eq $inputTokens) {
    $warnings.Add("per-call input/output token breakdown not found in model.model_call_success events -- inputTokens/outputTokens unavailable")
}

[PSCustomObject]@{
    inputTokens          = $inputTokens
    outputTokens          = $outputTokens
    cacheReadTokens       = $null
    cacheCreationTokens   = $null
    toolCallCount         = $toolCallCount
    estCost               = $lastCheckpoint.totalNanoAiu
    costUnit              = "nano_ai_credits"
    totalPremiumRequests  = $lastCheckpoint.totalPremiumRequests
    warnings              = $warnings
    raw                   = $events
}
```

- [ ] **Step 2: Verify error path**

Run:
```powershell
$result = & "Benchmarks\copilot-vs-claude\lib\extract-copilot-metrics.ps1" -SessionId "00000000-0000-0000-0000-000000000000"
$result.error
```
Expected: prints a string starting with `metrics unavailable: no session log found at`.

- [ ] **Step 3: Commit**

```bash
git add Benchmarks/copilot-vs-claude/lib/extract-copilot-metrics.ps1
git commit -m "$(cat <<'EOF'
Add Copilot CLI metrics extractor

Parses ~/.copilot/session-state/<id>/events.jsonl's
session.usage_checkpoint for cost/premium-request totals and
model.model_call_success events for per-call token counts.
Token fields degrade to null with explicit warnings (not zero) when
the expected usage sub-object isn't found, since the exact shape is
unverified against a live paid call until Task 11's smoke test.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

### Task 9: Write objective check scripts [x] DONE

**Files:**
- Create: `Benchmarks/copilot-vs-claude/lib/checks/check-correctness.ps1`
- Create: `Benchmarks/copilot-vs-claude/lib/checks/check-graph-map.ps1`
- Create: `Benchmarks/copilot-vs-claude/lib/checks/check-test-generation.ps1`
- Create: `Benchmarks/copilot-vs-claude/lib/checks/check-code-review.ps1`

**Does NOT cover:** running these against a `node_modules`-excluded artifacts copy -- all four accept `-ProjectDir`, which `run-benchmark.ps1` (Task 10) must pass as the live `sample-project/` working directory (which still has `node_modules`), not the archival artifacts snapshot.

- [ ] **Step 1: Create `check-correctness.ps1`**

```powershell
param(
    [string]$ProjectDir,
    [string]$TranscriptPath
)
$ErrorActionPreference = "Stop"
try {
    Push-Location $ProjectDir
    npm test -- --testPathPattern=inventory 2>&1 | Out-Null
    $result = $LASTEXITCODE
    Pop-Location
    exit $result
} catch {
    Write-Error $_
    exit 2
}
```

- [ ] **Step 2: Create `check-graph-map.ps1`**

```powershell
param(
    [string]$ProjectDir,
    [string]$TranscriptPath
)
try {
    $htmlFiles = Get-ChildItem -Path $ProjectDir -Recurse -Filter "*.html" -ErrorAction SilentlyContinue
    if (-not $htmlFiles) {
        Write-Output "FAIL: no HTML file found under $ProjectDir"
        exit 1
    }
    $forceGraphFile = $htmlFiles | Where-Object {
        (Get-Content $_.FullName -Raw) -match "force-graph|forceSimulation"
    } | Select-Object -First 1
    if (-not $forceGraphFile) {
        Write-Output "FAIL: no HTML file under $ProjectDir contains force-graph/forceSimulation markers (looks like a tree-layout fallback)"
        exit 1
    }
    Write-Output "PASS: force-graph output found at $($forceGraphFile.FullName)"
    exit 0
} catch {
    Write-Error $_
    exit 2
}
```

- [ ] **Step 3: Create `check-test-generation.ps1`**

```powershell
param(
    [string]$ProjectDir,
    [string]$TranscriptPath
)
try {
    $testFile = Get-ChildItem -Path (Join-Path $ProjectDir "src") -Recurse -Filter "*pricing*test*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $testFile) {
        Write-Output "FAIL: no test file matching *pricing*test* found under $ProjectDir\src"
        exit 1
    }
    $content = Get-Content $testFile.FullName -Raw
    if ($content -notmatch "(?i)(quantity.{0,20}(0|-)|negative)") {
        Write-Output "FAIL: test file $($testFile.FullName) does not appear to cover the zero/negative quantity edge case"
        exit 1
    }
    Push-Location $ProjectDir
    npm test -- --testPathPattern=pricing 2>&1 | Out-Null
    $testExit = $LASTEXITCODE
    Pop-Location
    if ($testExit -ne 0) {
        Write-Output "FAIL: generated pricing tests do not pass (exit $testExit)"
        exit 1
    }
    Write-Output "PASS: pricing tests found, cover zero/negative quantity, and pass"
    exit 0
} catch {
    Write-Error $_
    exit 2
}
```

- [ ] **Step 4: Create `check-code-review.ps1`**

```powershell
param(
    [string]$ProjectDir,
    [string]$TranscriptPath
)
try {
    if (-not (Test-Path $TranscriptPath)) {
        Write-Output "FAIL: transcript not found at $TranscriptPath"
        exit 1
    }
    $content = Get-Content $TranscriptPath -Raw
    if ($content -match "(?i)(timestamps\.length > limit|off.by.one|off by one|>\s*limit)") {
        Write-Output "PASS: transcript references the seeded rateLimiter off-by-one bug"
        exit 0
    }
    Write-Output "FAIL: transcript does not appear to reference the seeded bug"
    exit 1
} catch {
    Write-Error $_
    exit 2
}
```

- [ ] **Step 5: Verify all four scripts have a consistent, callable parameter signature**

Run:
```powershell
foreach ($f in Get-ChildItem "Benchmarks\copilot-vs-claude\lib\checks\*.ps1") {
    $params = (Get-Command $f.FullName).Parameters.Keys
    "$($f.Name): $($params -join ', ')"
}
```
Expected: all four lines show `ProjectDir, TranscriptPath` (plus PowerShell's common parameters) -- confirms `run-benchmark.ps1` can invoke every check script with the same two named arguments.

- [ ] **Step 6: Commit**

```bash
git add Benchmarks/copilot-vs-claude/lib/checks
git commit -m "$(cat <<'EOF'
Add objective pass/fail check scripts for 4 benchmark tasks

check-correctness (npm test on inventory), check-graph-map (real
force-graph HTML, not a tree fallback), check-test-generation
(pricing tests exist, cover the edge case, and pass),
check-code-review (transcript references the seeded off-by-one bug).
Exit 0/1/2 = pass/fail/check-itself-errored throughout, so a broken
check never reads as the agent having failed the task.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

### Task 10: Write run-benchmark.ps1 [x] DONE

**Files:**
- Create: `Benchmarks/copilot-vs-claude/run-benchmark.ps1`

**Does NOT cover:** the actual paid execution of all 22 invocations -- that's a manual step the user runs themselves later. This task's own verification (Task 11/12) only covers dry-run and a 2-call smoke test.

- [ ] **Step 1: Create the script**

```powershell
param(
    [switch]$Execute,
    [switch]$Force,
    [string]$TaskFilter,
    [string]$TasksJsonPath = (Join-Path $PSScriptRoot "tasks\tasks.json"),
    [string]$SampleProjectDir = (Join-Path $PSScriptRoot "sample-project"),
    [string]$ResultsRoot = (Join-Path $PSScriptRoot "results")
)
$ErrorActionPreference = "Stop"

$tasks = Get-Content $TasksJsonPath -Raw | ConvertFrom-Json
if ($TaskFilter) {
    $tasks = @($tasks | Where-Object { $_.id -eq $TaskFilter })
    if ($tasks.Count -eq 0) {
        throw "No task found with id '$TaskFilter'"
    }
}

$invocationCount = $tasks.Count * 2
Write-Host "Planned invocations: $invocationCount ($($tasks.Count) tasks x 2 agents)" -ForegroundColor Cyan

function Resolve-SyntheticLog {
    param([string]$Text)
    if ($Text.Contains("{{SYNTHETIC_LOG}}")) {
        $log = & (Join-Path $PSScriptRoot "lib\generate-synthetic-log.ps1")
        return $Text.Replace("{{SYNTHETIC_LOG}}", $log)
    }
    return $Text
}

foreach ($task in $tasks) {
    $turns = if ($task.mode -eq "multi-turn") { $task.turns } else { @($task.prompt) }
    $turns = $turns | ForEach-Object { Resolve-SyntheticLog $_ }

    Write-Host "`n=== Task: $($task.id) ($($task.dimension)) ===" -ForegroundColor Yellow
    foreach ($t in $turns) {
        $preview = if ($t.Length -gt 100) { $t.Substring(0, 100) + "..." } else { $t }
        Write-Host "  Turn: $preview"
    }
}

if (-not $Execute) {
    Write-Host "`nDry run only -- no invocations made. Re-run with -Execute to spend real API usage ($invocationCount calls)." -ForegroundColor Cyan
    return
}

if (-not $Force) {
    $confirm = Read-Host "About to make $invocationCount real Sonnet 5 API calls across both CLIs. Type YES to proceed"
    if ($confirm -ne "YES") {
        Write-Host "Aborted." -ForegroundColor Red
        return
    }
}

$runTimestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$runDir = Join-Path $ResultsRoot $runTimestamp

foreach ($task in $tasks) {
    $turns = if ($task.mode -eq "multi-turn") { $task.turns } else { @($task.prompt) }
    $turns = $turns | ForEach-Object { Resolve-SyntheticLog $_ }

    foreach ($agent in @("claude", "copilot")) {
        $taskOutDir = Join-Path $runDir "$($task.id)\$agent"
        New-Item -ItemType Directory -Path $taskOutDir -Force | Out-Null

        & (Join-Path $PSScriptRoot "lib\reset-sample-project.ps1")

        $invokeScript = Join-Path $PSScriptRoot "lib\invoke-$agent.ps1"
        $invocation = & $invokeScript -Turns $turns -WorkingDir $SampleProjectDir -OutDir $taskOutDir

        if ($task.objective_check) {
            $checkScript = Join-Path $PSScriptRoot "lib\checks\$($task.objective_check)"
            $checkOutput = & $checkScript -ProjectDir $SampleProjectDir -TranscriptPath $invocation.transcriptPath 2>&1
            $checkExit = $LASTEXITCODE
            "$checkExit`n$checkOutput" | Out-File (Join-Path $taskOutDir "objective-check-result.txt") -Encoding utf8
        }

        $artifactsDir = Join-Path $taskOutDir "artifacts"
        New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null
        Copy-Item -Path "$SampleProjectDir\*" -Destination $artifactsDir -Recurse -Force -Exclude "node_modules"

        $metricsScript = Join-Path $PSScriptRoot "lib\extract-$agent-metrics.ps1"
        $metrics = if ($agent -eq "claude") {
            & $metricsScript -SessionId $invocation.sessionId -OutDir $taskOutDir
        } else {
            & $metricsScript -SessionId $invocation.sessionId
        }
        $metrics | Add-Member -NotePropertyName wallClockMs -NotePropertyValue $invocation.wallClockMs -Force
        $metrics | ConvertTo-Json -Depth 10 | Out-File (Join-Path $taskOutDir "metrics.json") -Encoding utf8
    }
}

function New-BenchmarkReport {
    param([string]$RunDir, [object[]]$Tasks)
    $reportPath = Join-Path $RunDir "report.md"
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Benchmark Report -- $RunDir")
    $lines.Add("")
    $lines.Add("| Task | Dimension | Claude Objective | Copilot Objective | Claude ms | Copilot ms |")
    $lines.Add("|---|---|---|---|---|---|")
    foreach ($task in $Tasks) {
        $claudeCheckFile = Join-Path $RunDir "$($task.id)\claude\objective-check-result.txt"
        $copilotCheckFile = Join-Path $RunDir "$($task.id)\copilot\objective-check-result.txt"
        $claudeCheck = if (Test-Path $claudeCheckFile) { (Get-Content $claudeCheckFile)[1] } else { "n/a" }
        $copilotCheck = if (Test-Path $copilotCheckFile) { (Get-Content $copilotCheckFile)[1] } else { "n/a" }
        $claudeMetricsFile = Join-Path $RunDir "$($task.id)\claude\metrics.json"
        $copilotMetricsFile = Join-Path $RunDir "$($task.id)\copilot\metrics.json"
        $claudeMs = if (Test-Path $claudeMetricsFile) { (Get-Content $claudeMetricsFile -Raw | ConvertFrom-Json).wallClockMs } else { "n/a" }
        $copilotMs = if (Test-Path $copilotMetricsFile) { (Get-Content $copilotMetricsFile -Raw | ConvertFrom-Json).wallClockMs } else { "n/a" }
        $lines.Add("| $($task.id) | $($task.dimension) | $claudeCheck | $copilotCheck | $claudeMs | $copilotMs |")
    }
    $lines.Add("")
    $lines.Add("_Rubric scores for subjective dimensions are filled in manually after this run -- no automated judge exists, per the design spec's non-goals._")
    ($lines -join "`n") | Out-File $reportPath -Encoding utf8
    return $reportPath
}

$reportPath = New-BenchmarkReport -RunDir $runDir -Tasks $tasks
Write-Host "`nRun complete. Report at $reportPath" -ForegroundColor Green
```

- [ ] **Step 2: Commit**

```bash
git add Benchmarks/copilot-vs-claude/run-benchmark.ps1
git commit -m "$(cat <<'EOF'
Add benchmark driver script

Orchestrates reset -> invoke -> objective-check -> artifact-snapshot
-> metrics-extraction per (task x agent), dry-run by default,
requires -Execute plus an interactive YES confirmation (or -Force
for scripted runs) before spending real API usage, and generates
results/<timestamp>/report.md. Objective checks run against the
live sample-project directory (has node_modules), not the
node_modules-excluded artifacts snapshot.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
Expected: commit succeeds.

---

### Task 11: Dry-run verification [x] DONE

**Files:**
- None (verification only).

- [ ] **Step 1: Run the dry run**

Run: `& "Benchmarks\copilot-vs-claude\run-benchmark.ps1"` (from the DevSetup repo root, no `-Execute`)
Expected: prints `Planned invocations: 22 (11 tasks x 2 agents)`, then all 11 task IDs with a preview of each turn's text (the `context-management` task's first turn shows real substituted log lines, not the literal `{{SYNTHETIC_LOG}}` string), then `Dry run only -- no invocations made.` No `results/` directory is created.

- [ ] **Step 2: Confirm no results directory was created**

Run: `Test-Path "Benchmarks\copilot-vs-claude\results"`
Expected: `False` (or `True` with zero subdirectories, if the folder happens to pre-exist from a prior manual test -- either way, no new timestamped run folder).

---

### Task 12: Smoke test (2 real paid API calls)

**Files:**
- None (verification only -- generates real `results/` output as a side effect).

**Does NOT cover:** the remaining 20 invocations of the full suite. This task exists solely to validate the metrics-extraction pipeline against real CLI output before the user commits to the full paid run, per the design spec's Testing Strategy.

**⚠️ This step spends real money/credits on both platforms (2 real Sonnet 5 calls total). Confirm with the user before running.**

- [ ] **Step 1: Get explicit user go-ahead, then run the smoke test**

Run: `& "Benchmarks\copilot-vs-claude\run-benchmark.ps1" -Execute -Force -TaskFilter "correctness"`
Expected: `Planned invocations: 2 (1 tasks x 2 agents)`, then real invocations of both `claude` and `copilot` against the `correctness` task, then `Run complete. Report at ...\results\<timestamp>\report.md`.

- [ ] **Step 2: Verify metrics extraction produced real numbers, not `unavailable`**

Run:
```powershell
$latestRun = Get-ChildItem "Benchmarks\copilot-vs-claude\results" -Directory | Sort-Object Name -Descending | Select-Object -First 1
$claudeMetrics = Get-Content (Join-Path $latestRun.FullName "correctness\claude\metrics.json") -Raw | ConvertFrom-Json
$copilotMetrics = Get-Content (Join-Path $latestRun.FullName "correctness\copilot\metrics.json") -Raw | ConvertFrom-Json
$claudeMetrics
$copilotMetrics
```
Expected: `$claudeMetrics.error` is `$null` and `$claudeMetrics.inputTokens`/`outputTokens` are positive integers. `$copilotMetrics.error` is `$null` and `$copilotMetrics.estCost` is a positive number; if `$copilotMetrics.warnings` is non-empty, note which fields it flagged (expected risk per this plan's Assumptions -- the per-call token breakdown may be unavailable even though the checkpoint-level cost data is fine) rather than treating it as a failure.

- [ ] **Step 3: Verify the objective check ran and produced a real pass/fail**

Run: `Get-Content (Join-Path $latestRun.FullName "correctness\claude\objective-check-result.txt")` and the same for `copilot`.
Expected: first line is `0` (pass) or `1` (fail) -- either is an acceptable smoke-test outcome (this validates the *pipeline*, not that either agent necessarily solved the task correctly); a `2` (check errored) would indicate a bug in `check-correctness.ps1` worth investigating before the full run.

- [ ] **Step 4: If any step above surfaced `metrics unavailable` or a schema mismatch, fix the relevant extractor script now, before the full paid run**

This step has no fixed code -- what to fix depends on what the smoke test actually revealed (real CLI output can't be predicted from documentation alone, which is exactly why this task exists). Compare the actual JSON/JSONL shape in `results/<timestamp>/correctness/*/turn-0-stdout.json` (Claude) or `~/.copilot/session-state/<sessionId>/events.jsonl` (Copilot) against what `extract-claude-metrics.ps1`/`extract-copilot-metrics.ps1` expect, adjust the field paths, re-run Step 1 if changed, and re-verify Step 2.
