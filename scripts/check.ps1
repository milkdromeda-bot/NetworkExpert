. (Join-Path $PSScriptRoot "Runtime.ps1")

$node = Resolve-NetworkExpertNode
$root = Get-NetworkExpertRoot

& $node --check (Join-Path $root "server.js")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$files = @(
  "src/main.js",
  "src/importer.js",
  "src/parser.js",
  "src/timeline.js",
  "src/navigation.js",
  "src/analysis.js",
  "src/alerts.js",
  "src/compare.js",
  "src/profiles.js",
  "src/search.js",
  "src/ip-intel.js",
  "src/aliases.js",
  "src/topology.js"
)

foreach ($file in $files) {
  & $node --check (Join-Path $root $file)
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Syntax check OK"


