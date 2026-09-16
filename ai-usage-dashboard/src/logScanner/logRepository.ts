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
