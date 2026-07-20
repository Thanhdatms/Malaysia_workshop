# One-command launcher for workshop day.
# Builds the frontend, then starts the backend on 0.0.0.0:8000 serving both
# the API and the built frontend, so every teammate on the same wifi can
# open http://<this-machine-LAN-IP>:8000 in their browser.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Building frontend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\frontend"
npm run build

Write-Host "`nStarting server..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"

$ips = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -notlike '172.*' } |
  Select-Object -ExpandProperty IPAddress

Write-Host "`nShare this with your teams (same wifi):" -ForegroundColor Green
foreach ($ip in $ips) { Write-Host "  http://${ip}:8000" -ForegroundColor Green }
Write-Host "Facilitator admin dashboard:" -ForegroundColor Yellow
foreach ($ip in $ips) { Write-Host "  http://${ip}:8000/admin" -ForegroundColor Yellow }
Write-Host ""

& ".\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
