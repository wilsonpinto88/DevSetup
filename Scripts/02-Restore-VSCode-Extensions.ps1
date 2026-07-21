# 02-Restore-VSCode-Extensions.ps1
# Restores VS Code extensions from the saved list.

$base = Split-Path -Parent $PSScriptRoot
$extFile = Join-Path $base "vscode-extensions.txt"

Write-Host "Using DevSetup folder at: $base" -ForegroundColor Cyan

if (-not (Test-Path $extFile)) {
    Write-Error "vscode-extensions.txt not found at $extFile"
    exit 1
}

function Test-CliWorks {
    param([string]$Cli)
    try {
        & $Cli --version *> $null
        return $LASTEXITCODE -eq 0
    } catch { return $false }
}

$cli = $null
if ((Get-Command code -ErrorAction SilentlyContinue) -and (Test-CliWorks "code")) { $cli = "code" }
if (-not $cli) {
    Write-Error "'code' not found on PATH (or found but not working). Install VS Code, repair the CLI shim, or add it to PATH."
    exit 1
}
Write-Host "Using CLI: $cli" -ForegroundColor Cyan

# Check what's already installed once instead of invoking the CLI (and its own
# update/network check) for every extension on repeat runs.
Write-Host "Checking already-installed extensions..." -ForegroundColor Gray
$installedExt = @(& $cli --list-extensions 2>$null)

Write-Host "Installing extensions from vscode-extensions.txt..." -ForegroundColor Cyan

$installed = 0
$alreadyInstalled = 0
Get-Content $extFile | ForEach-Object {
    $ext = $_.Trim()
    if ($ext -ne "") {
        if ($installedExt -contains $ext) {
            Write-Host "Already installed, skipping: $ext" -ForegroundColor Gray
            $alreadyInstalled++
        } else {
            Write-Host "Installing extension: $ext" -ForegroundColor Yellow
            & $cli --install-extension $ext
            $installed++
        }
    }
}

Write-Host "Installed $installed extension(s), $alreadyInstalled already present." -ForegroundColor Green

