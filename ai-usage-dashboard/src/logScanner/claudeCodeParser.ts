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
