$ErrorActionPreference = 'Stop'

function Emit([string]$Text) {
    $out = @{ hookSpecificOutput = @{ additionalContext = $Text } } | ConvertTo-Json -Compress -Depth 5
    Write-Output $out
}

try {
    $raw = [Console]::In.ReadToEnd()
    $raw = $raw.TrimStart([char]0xFEFF)
    $payload = $null
    if ($raw) {
        try { $payload = $raw | ConvertFrom-Json } catch { $payload = $null }
    }

    $workspaceRoot = $null
    if ($payload -and $payload.cwd) { $workspaceRoot = $payload.cwd }
    elseif ($payload -and $payload.workspaceFolder) { $workspaceRoot = $payload.workspaceFolder }
    else { $workspaceRoot = (Get-Location).Path }

    if (-not (Test-Path $workspaceRoot)) {
        exit 0
    }

    $notes = New-Object System.Collections.Generic.List[string]

    # --- .vscode/mcp.json: ensure context-mode server entry exists ---
    $vscodeDir = Join-Path $workspaceRoot ".vscode"
    $mcpPath = Join-Path $vscodeDir "mcp.json"

    $mcpConfig = $null
    if (Test-Path $mcpPath) {
        try {
            $mcpConfig = Get-Content $mcpPath -Raw -Encoding UTF8 | ConvertFrom-Json
        } catch {
            $mcpConfig = $null
        }
    }

    if ($null -eq $mcpConfig) {
        $mcpConfig = [PSCustomObject]@{ servers = [PSCustomObject]@{} }
    }
    if (-not $mcpConfig.PSObject.Properties.Name -contains 'servers') {
        $mcpConfig | Add-Member -MemberType NoteProperty -Name 'servers' -Value ([PSCustomObject]@{})
    }

    $hasContextMode = $mcpConfig.servers.PSObject.Properties.Name -contains 'context-mode'
    if (-not $hasContextMode) {
        $mcpConfig.servers | Add-Member -MemberType NoteProperty -Name 'context-mode' -Value ([PSCustomObject]@{ command = 'context-mode' })
        if (-not (Test-Path $vscodeDir)) { New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null }
        $json = $mcpConfig | ConvertTo-Json -Depth 10
        [System.IO.File]::WriteAllText($mcpPath, $json, [System.Text.UTF8Encoding]::new($false))
        $notes.Add("created/updated .vscode/mcp.json (added context-mode MCP server)")
    }

    # --- .github/hooks/context-mode.json: create if entirely missing ---
    $hooksDir = Join-Path $workspaceRoot ".github\hooks"
    $hookPath = Join-Path $hooksDir "context-mode.json"

    if (-not (Test-Path $hookPath)) {
        $hookTemplate = @{
            version = 1
            hooks = @{
                sessionStart = @(@{ type = "command"; command = "context-mode hook vscode-copilot sessionstart"; timeoutSec = 15 })
                preToolUse   = @(@{ type = "command"; command = "context-mode hook vscode-copilot pretooluse"; timeoutSec = 10 })
                postToolUse  = @(@{ type = "command"; command = "context-mode hook vscode-copilot posttooluse"; timeoutSec = 10 })
                preCompact   = @(@{ type = "command"; command = "context-mode hook vscode-copilot precompact"; timeoutSec = 10 })
            }
        }
        if (-not (Test-Path $hooksDir)) { New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null }
        $json = $hookTemplate | ConvertTo-Json -Depth 10
        [System.IO.File]::WriteAllText($hookPath, $json, [System.Text.UTF8Encoding]::new($false))
        $notes.Add("created .github/hooks/context-mode.json (context-mode sessionStart/preToolUse/postToolUse/preCompact wiring)")
    }

    # --- global install check ---
    $cmCommand = Get-Command context-mode -ErrorAction SilentlyContinue
    if (-not $cmCommand) {
        $notes.Add("WARNING: 'context-mode' is not on PATH -- the MCP server will fail to start. Run: npm install -g context-mode --ignore-scripts (see AgentSetup/README.md for the better-sqlite3 native-module workaround)")
    }

    if ($notes.Count -gt 0) {
        Emit(($notes -join "; "))
    }
    exit 0
} catch {
    # Never block session start on a bootstrap failure.
    exit 0
}
