# 01-Install-Core-Apps.ps1
# Optional. Run in elevated PowerShell (Run as Administrator) on the fresh machine.
# Restores the full winget-packages.json app list. Not required for the AI agent
# environment (script 04 + the "bootstrap superpowers" skill) -- run this only if
# you also want the rest of your apps restored via winget.

# Allow local scripts (run this once per machine if needed)
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force

$base = Split-Path -Parent $PSScriptRoot
$wingetExport = Join-Path $base "winget-packages.json"

Write-Host "Using DevSetup folder at: $base" -ForegroundColor Cyan

# Check what's already installed once (one winget list call) instead of letting winget
# import/install re-check the source per package -- much faster on repeat runs, and
# avoids re-triggering installs for apps that self-update outside winget's tracking,
# where `winget import`'s own version check can otherwise decide a reinstall/repair
# is needed even though the app is already present.
Write-Host "Checking already-installed packages..." -ForegroundColor Gray
$installedList = winget list 2>&1 | Out-String -Width 500

function Install-WingetApp {
    param([string]$Id, [string]$Name)
    if ($installedList -match [regex]::Escape($Id)) {
        Write-Host "Already installed, skipping: $Name ($Id)" -ForegroundColor Gray
    } else {
        Write-Host "Installing: $Name ($Id)" -ForegroundColor Yellow
        winget install -e --id $Id --accept-source-agreements --accept-package-agreements
    }
}

if (Test-Path $wingetExport) {
    Write-Host "Installing packages from winget-packages.json (skipping ones already installed)..." -ForegroundColor Cyan
    try {
        $export = Get-Content $wingetExport -Raw | ConvertFrom-Json
        $exportIds = @($export.Sources | ForEach-Object { $_.Packages } | ForEach-Object { $_.PackageIdentifier })
        foreach ($id in $exportIds) {
            Install-WingetApp -Id $id -Name $id
        }
    } catch {
        Write-Warning "Could not parse winget-packages.json ($($_.Exception.Message)). Falling back to 'winget import'."
        winget import -i $wingetExport --accept-source-agreements --accept-package-agreements
    }
} else {
    Write-Warning "winget-packages.json not found at $wingetExport. Skipping import."
}

Write-Host "Ensuring key tools are installed via winget..." -ForegroundColor Cyan

# NVM for Windows (Node Version Manager) -- needed for script 03's Node/npm steps
Install-WingetApp -Id "CoreyButler.NVMforWindows" -Name "NVM for Windows"

Write-Host "Core apps installation script finished." -ForegroundColor Green
