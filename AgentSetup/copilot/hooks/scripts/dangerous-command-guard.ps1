$ErrorActionPreference = 'Stop'

function Deny([string]$Reason) {
    $out = @{ permissionDecision = 'deny'; permissionDecisionReason = $Reason } | ConvertTo-Json -Compress
    Write-Output $out
    exit 2
}

function AllowAndExit() {
    Write-Output '{"permissionDecision":"allow"}'
    exit 0
}

$raw = [Console]::In.ReadToEnd()
$raw = $raw.TrimStart([char]0xFEFF)

try {
    $payload = $raw | ConvertFrom-Json
} catch {
    Deny "dangerous-command-guard hook could not parse tool input JSON; failing closed"
}

$cmd = $payload.toolArgs.command
if (-not $cmd) {
    AllowAndExit
}

$dangerousPatterns = @(
    'rm\s+-[a-zA-Z]*r[a-zA-Z]*f',
    'rm\s+-[a-zA-Z]*f[a-zA-Z]*r',
    'Remove-Item[^\n]*-Recurse[^\n]*-Force',
    'Remove-Item[^\n]*-Force[^\n]*-Recurse',
    '\bdd\s+if=',
    '\bmkfs\b',
    'git\s+push\s+[^\n]*--force',
    'git\s+reset\s+--hard',
    'Format-Volume',
    '\bformat\s+[a-zA-Z]:'
)

foreach ($pattern in $dangerousPatterns) {
    if ($cmd -match $pattern) {
        Deny "Blocked by dangerous-command-guard hook: command matches destructive pattern '$pattern'. Confirm intent with the user before running manually."
    }
}

AllowAndExit
