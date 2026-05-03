. (Join-Path $PSScriptRoot "Runtime.ps1")

$pidFile = Get-NetworkExpertPidFile

if (-not (Test-Path $pidFile)) {
  Write-Host "No tracked server to stop."
  exit 0
}

$pidValue = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pidValue) {
  $process = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $process.Id
    Write-Host "Stopped server PID $($process.Id)"
  } else {
    Write-Host "Tracked PID not running anymore."
  }
}

Remove-Item $pidFile -ErrorAction SilentlyContinue
