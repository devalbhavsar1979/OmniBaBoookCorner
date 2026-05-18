#Requires -RunAsAdministrator
# ============================================================
# Ba Book Corner — Windows Service Uninstaller
# Stops and removes both Ba Book Corner Windows services.
#
# Run as Administrator:
#   powershell -ExecutionPolicy Bypass -File uninstall-services.ps1
# ============================================================

$ErrorActionPreference = "Continue"

$nssmExe    = "c:\Relisant\BaBookCorner\nssm.exe"
$services   = @("BaBookCorner-Backend", "BaBookCorner-Frontend")
$fwRules    = @("BaBookCorner-Backend", "BaBookCorner-Frontend")

foreach ($svc in $services) {
    $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($s) {
        Write-Host "Stopping $svc..." -ForegroundColor Yellow
        if (Test-Path $nssmExe) {
            & $nssmExe stop $svc | Out-Null
        } else {
            Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
        Write-Host "Removing $svc..." -ForegroundColor Yellow
        if (Test-Path $nssmExe) {
            & $nssmExe remove $svc confirm | Out-Null
        } else {
            sc.exe delete $svc | Out-Null
        }
        Write-Host "  Removed: $svc" -ForegroundColor Green
    } else {
        Write-Host "  Not found: $svc (skipped)" -ForegroundColor DarkGray
    }
}

foreach ($rule in $fwRules) {
    netsh advfirewall firewall delete rule name=$rule 2>$null | Out-Null
    Write-Host "  Firewall rule removed: $rule" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Ba Book Corner services uninstalled." -ForegroundColor Green
