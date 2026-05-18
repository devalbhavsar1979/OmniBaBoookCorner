#Requires -RunAsAdministrator
# ============================================================
# Ba Book Corner — Windows Service Installer
# Installs backend (port 2000) and frontend (port 7000)
# as auto-start Windows services via NSSM.
#
# Run once as Administrator:
#   powershell -ExecutionPolicy Bypass -File install-services.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$projectDir  = "c:\Relisant\BaBookCorner"
$backendDir  = "$projectDir\backend"
$frontendDir = "$projectDir\frontend"
$logsDir     = "$projectDir\logs"
$nssmExe     = "$projectDir\nssm.exe"

$backendSvc  = "BaBookCorner-Backend"
$frontendSvc = "BaBookCorner-Frontend"

# ── Helpers ──────────────────────────────────────────────────
function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    WARN: $msg" -ForegroundColor Yellow }

# ── 1. Prerequisites ─────────────────────────────────────────
Write-Step "Checking prerequisites"

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) { throw "Python not found. Install Python and ensure it is on PATH." }
$pythonExe = $pythonCmd.Source
Write-OK "Python: $pythonExe"

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { throw "Node.js not found. Install Node.js and ensure it is on PATH." }
$nodeExe = $nodeCmd.Source
Write-OK "Node:   $nodeExe"

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
Write-OK "Logs directory: $logsDir"

# ── 2. Download NSSM if missing ───────────────────────────────
Write-Step "Checking NSSM"
if (-not (Test-Path $nssmExe)) {
    Write-Host "    Downloading NSSM 2.24..." -ForegroundColor Yellow
    $zipPath = "$projectDir\nssm.zip"
    $tempDir  = "$projectDir\nssm-temp"
    try {
        Invoke-WebRequest "https://nssm.cc/release/nssm-2.24.zip" -OutFile $zipPath -UseBasicParsing
        Expand-Archive $zipPath -DestinationPath $tempDir -Force
        Copy-Item "$tempDir\nssm-2.24\win64\nssm.exe" $nssmExe -Force
    } finally {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    }
}
Write-OK "NSSM: $nssmExe"

# ── 3. Helper: remove an existing service cleanly ────────────
function Remove-ServiceIfExists($name) {
    $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
    if ($svc) {
        Write-Host "    Stopping/removing existing '$name' service..." -ForegroundColor Yellow
        if ($svc.Status -eq 'Running') {
            & $nssmExe stop $name | Out-Null
            Start-Sleep -Seconds 2
        }
        & $nssmExe remove $name confirm | Out-Null
    }
}

# ── 4. Install Backend service ────────────────────────────────
Write-Step "Installing '$backendSvc' (FastAPI on port 2000)"
Remove-ServiceIfExists $backendSvc

& $nssmExe install  $backendSvc $pythonExe
& $nssmExe set      $backendSvc AppParameters    "-m uvicorn main:app --host 0.0.0.0 --port 2000"
& $nssmExe set      $backendSvc AppDirectory     $backendDir
& $nssmExe set      $backendSvc DisplayName      "Ba Book Corner - Backend API"
& $nssmExe set      $backendSvc Description      "FastAPI/uvicorn backend for Ba Book Corner (port 2000)"
& $nssmExe set      $backendSvc Start            SERVICE_AUTO_START
& $nssmExe set      $backendSvc AppStdout        "$logsDir\backend-stdout.log"
& $nssmExe set      $backendSvc AppStderr        "$logsDir\backend-stderr.log"
& $nssmExe set      $backendSvc AppRotateFiles   1
& $nssmExe set      $backendSvc AppRotateOnline  1
& $nssmExe set      $backendSvc AppRotateBytes   10485760   # 10 MB
Write-OK "Service '$backendSvc' installed"

# ── 5. Install Frontend service ───────────────────────────────
Write-Step "Installing '$frontendSvc' (static server on port 7000)"
Remove-ServiceIfExists $frontendSvc

$frontendScript = "$frontendDir\frontend-server.js"
if (-not (Test-Path $frontendScript)) {
    throw "frontend-server.js not found at $frontendScript. Run 'npm run build' in the frontend directory first."
}
$buildDir = "$frontendDir\build"
if (-not (Test-Path $buildDir)) {
    throw "frontend/build not found. Run 'npm run build' in the frontend directory first."
}

& $nssmExe install  $frontendSvc $nodeExe
& $nssmExe set      $frontendSvc AppParameters   "`"$frontendScript`""
& $nssmExe set      $frontendSvc AppDirectory    $frontendDir
& $nssmExe set      $frontendSvc DisplayName     "Ba Book Corner - Frontend"
& $nssmExe set      $frontendSvc Description     "React SPA static server for Ba Book Corner (port 7000)"
& $nssmExe set      $frontendSvc Start           SERVICE_AUTO_START
& $nssmExe set      $frontendSvc AppStdout       "$logsDir\frontend-stdout.log"
& $nssmExe set      $frontendSvc AppStderr       "$logsDir\frontend-stderr.log"
& $nssmExe set      $frontendSvc AppRotateFiles  1
& $nssmExe set      $frontendSvc AppRotateOnline 1
& $nssmExe set      $frontendSvc AppRotateBytes  10485760
Write-OK "Service '$frontendSvc' installed"

# ── 6. Windows Firewall rules ─────────────────────────────────
Write-Step "Configuring Windows Firewall"
$rules = @(
    @{ Name="BaBookCorner-Backend";  Port=2000 },
    @{ Name="BaBookCorner-Frontend"; Port=7000 }
)
foreach ($r in $rules) {
    netsh advfirewall firewall delete rule name=$($r.Name) 2>$null | Out-Null
    netsh advfirewall firewall add rule `
        name=$($r.Name) dir=in action=allow protocol=TCP localport=$($r.Port) | Out-Null
    Write-OK "Firewall: port $($r.Port) open ($($r.Name))"
}

# ── 7. Start services ─────────────────────────────────────────
Write-Step "Starting services"
& $nssmExe start $backendSvc
Start-Sleep -Seconds 2
& $nssmExe start $frontendSvc

# ── 8. Summary ────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Ba Book Corner services installed and started!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host " Frontend UI  : http://43.249.231.181:7000" -ForegroundColor White
Write-Host " Backend API  : http://43.249.231.181:2000/api/v1" -ForegroundColor White
Write-Host " API Docs     : http://43.249.231.181:2000/api/docs" -ForegroundColor White
Write-Host ""
Write-Host " Logs         : $logsDir" -ForegroundColor DarkGray
Write-Host " Service mgmt : services.msc  or  nssm.exe" -ForegroundColor DarkGray
Write-Host ""
Write-Host " To check status:" -ForegroundColor DarkGray
Write-Host "   Get-Service BaBookCorner-Backend, BaBookCorner-Frontend" -ForegroundColor DarkGray
