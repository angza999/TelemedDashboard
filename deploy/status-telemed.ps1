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

Write-Host "Project: $ProjectRoot"
Write-Host "Expected URL: http://localhost:4300"

$listenerPid = Get-TelemedListenerPid

if (Test-Path $PidFile) {
  $pidValue = Get-Content -LiteralPath $PidFile | Select-Object -First 1
  $process = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
  if ($process) {
    Write-Host "Status: running"
    Write-Host "PID: $pidValue"
  } elseif ($listenerPid) {
    Write-Host "Status: running"
    Write-Host "PID: $listenerPid"
    Write-Host "Note: pid file was stale and has been refreshed."
    Set-Content -LiteralPath $PidFile -Value $listenerPid
  } else {
    Write-Host "Status: pid file exists but process is not running"
    Write-Host "PID file: $PidFile"
  }
} else {
  if ($listenerPid) {
    Write-Host "Status: running"
    Write-Host "PID: $listenerPid"
    Set-Content -LiteralPath $PidFile -Value $listenerPid
  } else {
    Write-Host "Status: no pid file"
  }
}

netstat -ano | Select-String ":4300"
