param(
  [int]$Port = 4173
)

. (Join-Path $PSScriptRoot "Runtime.ps1")

$root = Get-NetworkExpertRoot

& (Join-Path $root "scripts/stop-server.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& (Join-Path $root "scripts/start-server.ps1") -Port $Port
exit $LASTEXITCODE
