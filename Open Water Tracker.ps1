# Open Water Tracker 2.0 in the default browser (Windows).
$ErrorActionPreference = 'SilentlyContinue'
$port = 8765
Set-Location $PSScriptRoot

$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Start-Process -WindowStyle Hidden python -ArgumentList "-m","http.server","$port"
  Start-Sleep -Milliseconds 500
}

Start-Process "http://127.0.0.1:$port/"
