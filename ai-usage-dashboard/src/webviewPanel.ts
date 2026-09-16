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
