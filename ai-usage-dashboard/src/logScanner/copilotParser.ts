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
