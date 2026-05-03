. (Join-Path $PSScriptRoot "Runtime.ps1")

$root = Get-NetworkExpertRoot

& (Join-Path $root "scripts/check.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& (Join-Path $root "scripts/test.ps1")
exit $LASTEXITCODE
