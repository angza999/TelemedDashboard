$ErrorActionPreference = "SilentlyContinue"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$PidFile = Join-Path $ProjectRoot "output\telemed-server.pid"

function Get-TelemedListenerPid {
  $line = netstat -ano |
    Select-String -Pattern "^\s*TCP\s+\S+:4300\s+\S+\s+LISTENING\s+(\d+)\s*$" |
    Select-Object -First 1
  if ($line -and $line.Line -match "LISTENING\s+(\d+)\s*$") {
    return [int]$Matches[1]
  }
  return $null
}

if (Test-Path $PidFile) {
  $pidValue = Get-Content -LiteralPath $PidFile | Select-Object -First 1
  if ($pidValue) {
    Stop-Process -Id ([int]$pidValue) -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $PidFile -Force
    Write-Host "Telemed Dashboard stopped. PID=$pidValue"
    exit 0
  }
}

$listenerPid = Get-TelemedListenerPid
if ($listenerPid) {
  Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
  Write-Host "Telemed Dashboard stopped. PID=$listenerPid"
} else {
  Write-Host "Telemed Dashboard process was not found."
}
