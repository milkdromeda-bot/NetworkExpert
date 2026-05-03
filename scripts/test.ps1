. (Join-Path $PSScriptRoot "Runtime.ps1")

$node = Resolve-NetworkExpertNode
$root = Get-NetworkExpertRoot
$testFiles = Get-ChildItem (Join-Path $root "tests") -Filter "*.test.js" | Sort-Object Name

Push-Location $root
try {
  foreach ($file in $testFiles) {
    & $node --test --test-isolation=none $file.FullName
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  Write-Host "Tests OK"
  exit 0
} finally {
  Pop-Location
}
