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
