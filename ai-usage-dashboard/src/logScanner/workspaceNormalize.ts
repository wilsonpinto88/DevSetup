export function normalizeWorkspace(rawPath: string): string {
  if (!rawPath) {
    return 'unknown';
  }
  const normalized = rawPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const segments = normalized.split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : 'unknown';
}
