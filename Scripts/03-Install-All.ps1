# 03-Install-All.ps1
# Master script: optionally restores winget apps, then VS Code extensions, .NET tools, NVM/Node and global npm.
# Tracks progress to installation-progress.log and writes installation-status.txt after verification.

param(
    [switch]$IncludeWinget,  # Opt-in: also run 01-Install-Core-Apps.ps1 (winget app restore). Off by default.
    [switch]$SkipExtensions,
    [switch]$SkipDotNetTools,
    [switch]$SkipNode,
    [switch]$SkipVerify     # Skip post-run verification
)

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$base = Split-Path -Parent $scriptDir
$progressLog = Join-Path $base "installation-progress.log"
$statusFile = Join-Path $base "installation-status.txt"

function Write-ProgressLog {
    param([string]$Step, [string]$Item, [string]$Status, [string]$Message = "")
    $line = "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss') | $Step | $Item | $Status" + $(if ($Message) { " | $Message" } else { "" })
    Add-Content -Path $progressLog -Value $line -ErrorAction SilentlyContinue
}

Write-Host "`n========== DevSetup: Install All ==========" -ForegroundColor Cyan
Write-Host "Base folder: $base" -ForegroundColor Gray
Write-Host "Progress log: $progressLog" -ForegroundColor Gray
Write-Host ""

Write-ProgressLog -Step "Run" -Item "Start" -Status "Running"

# ---- Step 1: Core apps (winget) -- opt-in, off by default ----
if ($IncludeWinget) {
    Write-Host ">>> Step 1/5: Core apps (winget) <<<" -ForegroundColor Cyan
    Write-ProgressLog -Step "Winget" -Item "01-Install-Core-Apps.ps1" -Status "Running"
    & "$scriptDir\01-Install-Core-Apps.ps1"
    $s1 = if ($LASTEXITCODE -eq 0) { "Installed" } else { "Failed" }
    Write-ProgressLog -Step "Winget" -Item "01-Install-Core-Apps.ps1" -Status $s1 -Message "ExitCode $LASTEXITCODE"
    if ($LASTEXITCODE -ne 0) { Write-Warning "Step 1 had errors (e.g. run as Administrator for execution policy). Continuing." }
    Write-Host ""
} else {
    Write-ProgressLog -Step "Winget" -Item "01-Install-Core-Apps.ps1" -Status "Skipped"
    Write-Host ">>> Step 1/5: Skipped (winget -- opt-in with -IncludeWinget). <<<" -ForegroundColor Gray
}

# ---- Step 2: VS Code extensions ----
if (-not $SkipExtensions) {
    Write-Host ">>> Step 2/5: VS Code extensions <<<" -ForegroundColor Cyan
    Write-ProgressLog -Step "Extensions" -Item "02-Restore-VSCode-Extensions.ps1" -Status "Running"
    & "$scriptDir\02-Restore-VSCode-Extensions.ps1"
    $s2 = if ($LASTEXITCODE -eq 0) { "Installed" } else { "Failed" }
    Write-ProgressLog -Step "Extensions" -Item "02-Restore-VSCode-Extensions.ps1" -Status $s2
    Write-Host ""
} else {
    Write-ProgressLog -Step "Extensions" -Item "02-Restore-VSCode-Extensions.ps1" -Status "Skipped"
    Write-Host ">>> Step 2/5: Skipped (extensions). <<<" -ForegroundColor Gray
}

# ---- Step 3: .NET global tools ----
if (-not $SkipDotNetTools) {
    Write-Host ">>> Step 3/5: .NET global tools <<<" -ForegroundColor Cyan
    $dotnetFile = Join-Path $base "dotnet-tools.txt"
    if (Test-Path $dotnetFile) {
        $lines = Get-Content $dotnetFile
        $installed = 0
        $alreadyInstalled = 0
        $existingTools = @(dotnet tool list -g 2>&1 | Out-String -Width 500)
        foreach ($line in $lines) {
            $t = $line.Trim()
            if ($t -eq "" -or $t -match "^(Package|----|Version|Commands)") { continue }
            # First token is package id (e.g. microsoft.powerapps.cli.tool)
            $id = ($t -split '\s+')[0]
            if ($id -match '^[a-zA-Z0-9_.-]+$' -and $id -notmatch '^[\d.]+$') {
                if ($existingTools -match [regex]::Escape($id)) {
                    Write-Host "Already installed, skipping: $id" -ForegroundColor Gray
                    Write-ProgressLog -Step "DotNetTool" -Item $id -Status "AlreadyInstalled"
                    $alreadyInstalled++
                    continue
                }
                Write-Host "Installing .NET tool: $id" -ForegroundColor Yellow
                Write-ProgressLog -Step "DotNetTool" -Item $id -Status "Running"
                dotnet tool install -g $id
                $st = if ($LASTEXITCODE -eq 0) { "Installed" } else { "Failed" }
                Write-ProgressLog -Step "DotNetTool" -Item $id -Status $st
                if ($LASTEXITCODE -eq 0) { $installed++ }
            }
        }
        Write-Host "Installed $installed .NET tool(s), $alreadyInstalled already present." -ForegroundColor Green
    } else {
        Write-ProgressLog -Step "DotNetTool" -Item "dotnet-tools.txt" -Status "Skipped" -Message "File not found"
        Write-Warning "dotnet-tools.txt not found at $dotnetFile. Skipping."
    }
    Write-Host ""
} else {
    Write-ProgressLog -Step "DotNetTool" -Item "all" -Status "Skipped"
    Write-Host ">>> Step 3/5: Skipped (.NET tools). <<<" -ForegroundColor Gray
}

# ---- Step 4 & 5: NVM/Node and global npm ----
if (-not $SkipNode) {
    Write-Host ">>> Step 4/5: NVM / Node version <<<" -ForegroundColor Cyan
    $nodeVersionFile = Join-Path $base "node-version.txt"
    $nodeVer = $null
    if (Test-Path $nodeVersionFile) {
        $nodeVer = (Get-Content $nodeVersionFile -First 1).Trim()
    }
    if ($nodeVer) {
        if (Get-Command nvm -ErrorAction SilentlyContinue) {
            Write-Host "Installing Node $nodeVer via NVM..." -ForegroundColor Yellow
            Write-ProgressLog -Step "Node" -Item $nodeVer -Status "Running"
            nvm install $nodeVer 2>&1
            nvm use $nodeVer 2>&1
            Write-Host "Enabling corepack (pnpm)..." -ForegroundColor Yellow
            corepack enable 2>&1
            Write-ProgressLog -Step "Node" -Item $nodeVer -Status "Installed"
            Write-Host "Node step done." -ForegroundColor Green
        } else {
            Write-ProgressLog -Step "Node" -Item $nodeVer -Status "Failed" -Message "NVM not on PATH"
            Write-Warning "NVM not on PATH. Install NVM for Windows (winget install -e --id CoreyButler.NVMforWindows), open a new terminal, then run: nvm install $nodeVer; nvm use $nodeVer"
        }
    } else {
        Write-ProgressLog -Step "Node" -Item "node-version.txt" -Status "Skipped" -Message "No version specified"
        Write-Host "No node-version.txt (or empty). Add one line with your Node version (e.g. 20.11.0). Skipping NVM step." -ForegroundColor Gray
    }
    Write-Host ""

    Write-Host ">>> Step 5/5: Global npm packages <<<" -ForegroundColor Cyan
    $npmListFile = Join-Path $base "npm-global-packages.txt"
    if (Test-Path $npmListFile) {
        $packages = Get-Content $npmListFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" -and $_ -notmatch "^\s*#" }
        if ($packages) {
            $npm = Get-Command npm -ErrorAction SilentlyContinue
            if ($npm) {
                $existingNpm = @(npm list -g --depth=0 2>$null | Out-String -Width 500)
                $npmInstalled = 0
                $npmAlreadyInstalled = 0
                foreach ($pkg in $packages) {
                    $pkgName = $pkg.Split('@')[0]
                    if ($existingNpm -match [regex]::Escape($pkgName)) {
                        Write-Host "Already installed, skipping: $pkg" -ForegroundColor Gray
                        Write-ProgressLog -Step "NpmGlobal" -Item $pkg -Status "AlreadyInstalled"
                        $npmAlreadyInstalled++
                        continue
                    }
                    Write-Host "npm install -g $pkg" -ForegroundColor Yellow
                    Write-ProgressLog -Step "NpmGlobal" -Item $pkg -Status "Running"
                    npm install -g $pkg 2>&1
                    $sn = if ($LASTEXITCODE -eq 0) { "Installed" } else { "Failed" }
                    Write-ProgressLog -Step "NpmGlobal" -Item $pkg -Status $sn
                    if ($LASTEXITCODE -eq 0) { $npmInstalled++ }
                }
                Write-Host "Installed $npmInstalled npm package(s), $npmAlreadyInstalled already present." -ForegroundColor Green
            } else {
                Write-Warning "npm not on PATH. Ensure NVM/Node is active and run: Get-Content $npmListFile | ForEach-Object { npm install -g $_ }"
            }
        }
    } else {
        Write-Host "No npm-global-packages.txt. Create it with one package name per line to install globals. Skipping." -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-ProgressLog -Step "Node" -Item "all" -Status "Skipped"
    Write-ProgressLog -Step "NpmGlobal" -Item "all" -Status "Skipped"
    Write-Host ">>> Step 4/5 & 5/5: Skipped (Node/npm). <<<" -ForegroundColor Gray
}

Write-ProgressLog -Step "Run" -Item "End" -Status "Completed"

# ---- Verification: check what is actually installed ----
if (-not $SkipVerify) {
    Write-Host ">>> Verification: checking installed items <<<" -ForegroundColor Cyan
    Write-ProgressLog -Step "Verify" -Item "Start" -Status "Running"

    $statusLines = @()
    $statusLines += "DevSetup installation status - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $statusLines += ""

    # Winget: sample of packages from winget-packages.json (informational; only actually
    # installed by this run if -IncludeWinget was passed -- see Step 1 above)
    $wingetJson = Join-Path $base "winget-packages.json"
    if (Test-Path $wingetJson) {
        $statusLines += "--- Winget (sample) ---"
        try {
            $json = Get-Content $wingetJson -Raw | ConvertFrom-Json
            $idsFromExport = @($json.Sources[0].Packages | ForEach-Object { $_.PackageIdentifier })
            $ids = @($idsFromExport | Select-Object -Unique | Select-Object -First 25)
            $listOut = winget list 2>&1 | Out-String -Width 500
            foreach ($id in $ids) {
                $ok = $listOut -match [regex]::Escape($id)
                $statusLines += "  $(if ($ok) { '[OK]' } else { '[--]' }) $id"
            }
        } catch { $statusLines += "  (parse error)" }
        $statusLines += ""
    }

    # Extensions: expected from vscode-extensions.txt vs code --list-extensions
    $extFile = Join-Path $base "vscode-extensions.txt"
    if (Test-Path $extFile) {
        $statusLines += "--- Extensions ---"
        $expected = Get-Content $extFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
        $cli = if (Get-Command code -ErrorAction SilentlyContinue) { "code" } else { $null }
        if ($cli) {
            $installedExt = & $cli --list-extensions 2>$null
            foreach ($ext in $expected) {
                $ok = $installedExt -contains $ext
                $statusLines += "  $(if ($ok) { '[OK]' } else { '[--]' }) $ext"
            }
        } else { $statusLines += "  (code not found)" }
        $statusLines += ""
    }

    # .NET tools
    $dotnetFile = Join-Path $base "dotnet-tools.txt"
    if (Test-Path $dotnetFile) {
        $statusLines += "--- .NET global tools ---"
        $expectedIds = @()
        Get-Content $dotnetFile | ForEach-Object {
            $t = ($_ -split '\s+')[0]
            if ($t -match '^[a-zA-Z0-9_.-]+$' -and $t -notmatch '^(Package|----|Version|Commands)$') { $expectedIds += $t }
        }
        $toolList = dotnet tool list -g 2>&1 | Out-String -Width 500
        foreach ($id in $expectedIds) {
            $ok = $toolList -match [regex]::Escape($id)
            $statusLines += "  $(if ($ok) { '[OK]' } else { '[--]' }) $id"
        }
        $statusLines += ""
    }

    # Node
    $statusLines += "--- Node ---"
    $nodeVer = $null
    $nvf = Join-Path $base "node-version.txt"
    if (Test-Path $nvf) { $nodeVer = (Get-Content $nvf -First 1).Trim() }
    $currentNode = try { (node -v 2>$null) -replace '^v', '' } catch { "" }
    if (-not $currentNode) { $currentNode = "(not found)" }
    if ($nodeVer) {
        $ok = $currentNode -eq $nodeVer -or ($currentNode -ne "(not found)" -and $currentNode.StartsWith("$nodeVer."))
        $statusLines += "  $(if ($ok) { '[OK]' } else { '[--]' }) Node expected $nodeVer, current $currentNode"
    } else {
        $statusLines += "  (no node-version.txt) current: $currentNode"
    }
    $statusLines += ""

    # npm global packages
    $npmFile = Join-Path $base "npm-global-packages.txt"
    if (Test-Path $npmFile) {
        $statusLines += "--- npm global packages ---"
        $pkgs = Get-Content $npmFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" -and $_ -notmatch "^\s*#" }
        $npmList = npm list -g --depth=0 2>$null | Out-String
        foreach ($p in $pkgs) {
            $ok = $npmList -match [regex]::Escape($p) -or $npmList -match [regex]::Escape($p.Split('@')[0])
            $statusLines += "  $(if ($ok) { '[OK]' } else { '[--]' }) $p"
        }
        $statusLines += ""
    }

    $statusLines += "---"
    $statusLines += "[OK] = installed/verified  [--] = not found or not expected"
    $statusLines += "Progress log: $progressLog"

    $statusLines | Set-Content -Path $statusFile -Encoding UTF8
    Write-ProgressLog -Step "Verify" -Item "End" -Status "Completed" -Message "Status written to $statusFile"
    Write-Host "Status written to: $statusFile" -ForegroundColor Green
} else {
    Write-ProgressLog -Step "Verify" -Item "all" -Status "Skipped"
}

Write-Host "`n========== DevSetup: Install All finished ==========" -ForegroundColor Green
Write-Host "Progress log: $progressLog" -ForegroundColor Gray
Write-Host "Status file:  $statusFile" -ForegroundColor Gray
