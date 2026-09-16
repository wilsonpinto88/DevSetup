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
