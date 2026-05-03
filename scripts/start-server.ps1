param(
  [int]$Port = 4173
)

. (Join-Path $PSScriptRoot "Runtime.ps1")

$node = Resolve-NetworkExpertNode
$root = Get-NetworkExpertRoot
$pidFile = Get-NetworkExpertPidFile

if (Test-Path $pidFile) {
  $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($existingPid) {
    $existingProcess = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
    if ($existingProcess) {
      Write-Host "Server already running on PID $existingPid"
      Write-Host "URL: http://localhost:$Port"
      exit 0
    }
  }
  Remove-Item $pidFile -ErrorAction SilentlyContinue
}

$serverScript = Join-Path $root "server.js"
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $node
$startInfo.Arguments = "`"$serverScript`" --port=$Port"
$startInfo.WorkingDirectory = $root
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true

$process = [System.Diagnostics.Process]::Start($startInfo)

if (-not $process) {
  throw "Unable to start NetworkExpert server."
}

Set-Content -Path $pidFile -Value $process.Id
Write-Host "Server started on PID $($process.Id)"
Write-Host "URL: http://localhost:$Port"
