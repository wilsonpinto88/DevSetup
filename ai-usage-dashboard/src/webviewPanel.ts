// ai-usage-dashboard/src/webviewPanel.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Totals, GroupedTotal, DailyPoint, TimeRange } from './aggregator';
import { AllowanceResult } from './copilotAllowance';
import { CostBreakdown } from './pricing';

export interface DashboardData {
  totals: Totals;
  totalCostUsd: number | undefined; // undefined only when zero events have known pricing
  costBreakdown: CostBreakdown | undefined; // aggregated across all models with known pricing
  byModel: ModelUsageEntry[];
  byWorkspace: GroupedTotal[];
  dailySeries: DailyPoint[];
  range: TimeRange;
  source: SourceFilter;
  allowance: AllowanceResult | undefined;
}

let currentPanel: vscode.WebviewPanel | undefined;

export type SourceFilter = 'all' | 'claude-code' | 'copilot';

export interface ModelUsageEntry extends GroupedTotal {
  costUsd: number | undefined; // undefined when the model has no confirmed pricing rate
}

export function createOrShowPanel(
  context: vscode.ExtensionContext,
  onRequestUpdate: (range: TimeRange, source: SourceFilter) => void
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
    .replace(/\{\{cspSource\}\}/g, panel.webview.cspSource)
    .replace(/\{\{cssUri\}\}/g, cssUri.toString())
    .replace(/\{\{chartUri\}\}/g, chartUri.toString())
    .replace(/\{\{scriptUri\}\}/g, scriptUri.toString());
  panel.webview.html = html;

  panel.webview.onDidReceiveMessage((message) => {
    if (message?.type === 'rangeChange' || message?.type === 'refresh' || message?.type === 'sourceChange') {
      const source: SourceFilter = message.source === 'claude-code' || message.source === 'copilot' ? message.source : 'all';
      onRequestUpdate(message.range as TimeRange, source);
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
