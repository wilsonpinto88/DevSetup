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
