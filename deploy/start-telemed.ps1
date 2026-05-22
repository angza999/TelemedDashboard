param(
  [switch]$Hidden
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $ProjectRoot "output"
$OutLog = Join-Path $LogDir "telemed-server.out.log"
$ErrLog = Join-Path $LogDir "telemed-server.err.log"
$PidFile = Join-Path $LogDir "telemed-server.pid"

function Get-TelemedListenerPid {
  $line = netstat -ano |
    Select-String -Pattern "^\s*TCP\s+\S+:4300\s+\S+\s+LISTENING\s+(\d+)\s*$" |
    Select-Object -First 1
  if ($line -and $line.Line -match "LISTENING\s+(\d+)\s*$") {
    return [int]$Matches[1]
  }
  return $null
}

if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
  Write-Warning "No .env file found. Copy .env.production.example to .env and set SESSION_SECRET before production use."
}

$env:NODE_ENV = "production"

if ($Hidden) {
  $process = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"" `
    -WorkingDirectory ([string]$ProjectRoot) `
    -WindowStyle Hidden `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -PassThru
  Start-Sleep -Seconds 2
  $listenerPid = Get-TelemedListenerPid
  $pidToSave = if ($listenerPid) { $listenerPid } else { $process.Id }
  Set-Content -LiteralPath $PidFile -Value $pidToSave
  Write-Host "Telemed Dashboard started in background. PID=$pidToSave"
  Write-Host "URL: http://localhost:4300"
  exit 0
}

Set-Location $ProjectRoot
npm start
