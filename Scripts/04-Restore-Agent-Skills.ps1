# 04-Restore-Agent-Skills.ps1
# Fully restores the AI agent environment (skills, hooks, config, plugins)
# from this repo's AgentSetup\ folder. After running this, "bootstrap superpowers" cmd works.
#
# Usage (from wherever you cloned this repo):
#   cd DevSetup\Scripts
#   .\04-Restore-Agent-Skills.ps1
#
# Prerequisites: Git installed (for plugin cloning), VS Code installed.

$ErrorActionPreference = "Stop"

# --- Configuration ---
$backupRoot = Join-Path $PSScriptRoot "..\AgentSetup"
$targetAgentsSkills = Join-Path $env:USERPROFILE ".agents\skills"
$targetClaudeDir = Join-Path $env:USERPROFILE ".claude"
$targetClaudeSkills = Join-Path $targetClaudeDir "skills"
$targetVSCodeUser = Join-Path $env:APPDATA "Code\User"
$targetCopilotCliDir = Join-Path $env:USERPROFILE ".copilot"

# Plugin repos to clone
$plugins = @(
    @{ Name = "caveman"; Url = "https://github.com/JuliusBrussee/caveman.git" },
    @{ Name = "context-mode"; Url = "https://github.com/mksglu/context-mode.git" },
    @{ Name = "superpowers-optimized"; Url = "https://github.com/REPOZY/superpowers-optimized.git" }
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AI Agent Environment -- Full Restore" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Restore .agents/skills/ ---
$sourceAgentsSkills = Join-Path $backupRoot "agents-skills"
Write-Host "[1/7] Restoring .agents/skills/ ..." -ForegroundColor Yellow

if (Test-Path $sourceAgentsSkills) {
    Get-ChildItem -Path $sourceAgentsSkills -Directory | ForEach-Object {
        $targetPath = Join-Path $targetAgentsSkills $_.Name
        if (-not (Test-Path $targetPath)) {
            New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
        }
        Copy-Item -Path "$($_.FullName)\*" -Destination $targetPath -Recurse -Force
        Write-Host "  [OK] $($_.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "  [SKIP] Source not found: $sourceAgentsSkills" -ForegroundColor Red
}

# --- 2. Restore .claude/CLAUDE.MD ---
Write-Host "[2/7] Restoring .claude/CLAUDE.MD ..." -ForegroundColor Yellow

if (-not (Test-Path $targetClaudeDir)) {
    New-Item -ItemType Directory -Path $targetClaudeDir -Force | Out-Null
}

$sourceClaude = Join-Path $backupRoot "claude"
if (Test-Path "$sourceClaude\CLAUDE.MD") {
    Copy-Item "$sourceClaude\CLAUDE.MD" "$targetClaudeDir\CLAUDE.MD" -Force
    Write-Host "  [OK] CLAUDE.MD" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] CLAUDE.MD not found in backup" -ForegroundColor Red
}

# --- 3. Restore .claude/settings.json ---
Write-Host "[3/7] Restoring .claude/settings.json ..." -ForegroundColor Yellow

if (Test-Path "$sourceClaude\settings.json") {
    Copy-Item "$sourceClaude\settings.json" "$targetClaudeDir\settings.json" -Force
    Write-Host "  [OK] settings.json" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] settings.json not found in backup" -ForegroundColor Red
}

# --- 4. Restore .claude/skills/ ---
Write-Host "[4/7] Restoring .claude/skills/ ..." -ForegroundColor Yellow

$sourceClaudeSkills = Join-Path $sourceClaude "skills"
if (Test-Path $sourceClaudeSkills) {
    if (-not (Test-Path $targetClaudeSkills)) {
        New-Item -ItemType Directory -Path $targetClaudeSkills -Force | Out-Null
    }
    Copy-Item -Path "$sourceClaudeSkills\*" -Destination $targetClaudeSkills -Recurse -Force
    $count = (Get-ChildItem $targetClaudeSkills -File).Count
    Write-Host "  [OK] $count skill file(s) restored" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] No .claude/skills/ in backup" -ForegroundColor Red
}

# --- 5. Install plugins from git ---
Write-Host "[5/7] Installing plugins (git clone) ..." -ForegroundColor Yellow

$pluginsDir = Join-Path $targetClaudeDir "plugins\marketplaces"
if (-not (Test-Path $pluginsDir)) {
    New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
}

$gitAvailable = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
if ($gitAvailable) {
    foreach ($plugin in $plugins) {
        $pluginPath = Join-Path $pluginsDir $plugin.Name
        if (Test-Path $pluginPath) {
            Write-Host "  [OK] $($plugin.Name) (already exists)" -ForegroundColor Green
        } else {
            Write-Host "  Cloning $($plugin.Name)..." -ForegroundColor Gray
            git clone $plugin.Url $pluginPath 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] $($plugin.Name)" -ForegroundColor Green
            } else {
                Write-Host "  [FAIL] $($plugin.Name) -- clone failed" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "  [SKIP] Git not installed -- install git first, then re-run" -ForegroundColor Red
}

# --- 6. Restore Copilot config (VS Code User prompts + settings) ---
Write-Host "[6/7] Restoring Copilot config ..." -ForegroundColor Yellow

$sourceCopilot = Join-Path $backupRoot "copilot"
$sourcePrompts = Join-Path $sourceCopilot "prompts"
$targetPrompts = Join-Path $targetVSCodeUser "prompts"

if (Test-Path $sourcePrompts) {
    if (-not (Test-Path $targetPrompts)) {
        New-Item -ItemType Directory -Path $targetPrompts -Force | Out-Null
    }
    Copy-Item -Path "$sourcePrompts\*" -Destination $targetPrompts -Recurse -Force
    $count = (Get-ChildItem $targetPrompts -File).Count
    Write-Host "  [OK] $count prompt file(s) restored" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] No prompts/ in backup" -ForegroundColor Red
}

$sourceCopilotSettings = Join-Path $sourceCopilot "settings.copilot.json"
$targetVSCodeSettings = Join-Path $targetVSCodeUser "settings.json"

if (Test-Path $sourceCopilotSettings) {
    $copilotSettings = [System.IO.File]::ReadAllText($sourceCopilotSettings, [System.Text.Encoding]::UTF8) | ConvertFrom-Json

    if (Test-Path $targetVSCodeSettings) {
        $liveJson = [System.IO.File]::ReadAllText($targetVSCodeSettings, [System.Text.Encoding]::UTF8)
        $merged = $liveJson | ConvertFrom-Json
    } else {
        if (-not (Test-Path $targetVSCodeUser)) {
            New-Item -ItemType Directory -Path $targetVSCodeUser -Force | Out-Null
        }
        $merged = [PSCustomObject]@{}
    }

    # Merge: backup keys overwrite/add onto existing settings.json, everything else untouched
    foreach ($prop in $copilotSettings.PSObject.Properties) {
        if ($merged.PSObject.Properties.Name -contains $prop.Name) {
            $merged.($prop.Name) = $prop.Value
        } else {
            $merged | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value
        }
    }

    $mergedJson = $merged | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($targetVSCodeSettings, $mergedJson, [System.Text.UTF8Encoding]::new($false))
    $keyCount = ($copilotSettings.PSObject.Properties | Measure-Object).Count
    Write-Host "  [OK] settings.json merged ($keyCount Copilot keys)" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] No settings.copilot.json in backup" -ForegroundColor Red
}

# --- 7. Restore Copilot CLI personal instructions (for when Copilot CLI is installed) ---
Write-Host "[7/7] Restoring Copilot CLI instructions ..." -ForegroundColor Yellow

$sourceCliInstructions = Join-Path $sourceCopilot "copilot-cli-instructions.md"
$targetCliInstructions = Join-Path $targetCopilotCliDir "copilot-instructions.md"

if (Test-Path $sourceCliInstructions) {
    if (-not (Test-Path $targetCopilotCliDir)) {
        New-Item -ItemType Directory -Path $targetCopilotCliDir -Force | Out-Null
    }
    Copy-Item $sourceCliInstructions $targetCliInstructions -Force
    Write-Host "  [OK] ~/.copilot/copilot-instructions.md restored (used once GitHub Copilot CLI is installed)" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] No copilot-cli-instructions.md in backup" -ForegroundColor Red
}

# --- Verification ---
Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan

$checks = @(
    @{ Name = ".agents/skills/bootstrap"; Path = "$targetAgentsSkills\bootstrap\SKILL.md" },
    @{ Name = ".agents/skills/caveman"; Path = "$targetAgentsSkills\caveman\SKILL.md" },
    @{ Name = ".agents/skills/find-skills"; Path = "$targetAgentsSkills\find-skills\SKILL.md" },
    @{ Name = ".claude/CLAUDE.MD"; Path = "$targetClaudeDir\CLAUDE.MD" },
    @{ Name = ".claude/settings.json"; Path = "$targetClaudeDir\settings.json" },
    @{ Name = ".claude/skills/"; Path = $targetClaudeSkills },
    @{ Name = "Code/User/prompts/"; Path = $targetPrompts },
    @{ Name = "Code/User/settings.json"; Path = $targetVSCodeSettings },
    @{ Name = ".copilot/copilot-instructions.md"; Path = $targetCliInstructions }
)

foreach ($check in $checks) {
    $exists = Test-Path $check.Path
    $status = if ($exists) { "[OK]" } else { "[--]" }
    $color = if ($exists) { "Green" } else { "Red" }
    Write-Host "  $status $($check.Name)" -ForegroundColor $color
}

Write-Host ""
Write-Host "=== Done -- 'bootstrap superpowers' command ready ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: You will need to re-authenticate on first use." -ForegroundColor DarkGray
Write-Host "      .credentials.json is NOT restored (contains auth tokens)." -ForegroundColor DarkGray
