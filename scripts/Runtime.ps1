function Get-NetworkExpertRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Resolve-NetworkExpertNode {
  $bundled = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path $bundled) {
    return (Resolve-Path $bundled).Path
  }

  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "Node.js introuvable. Installez-le ou utilisez le runtime Codex embarque."
}

function Get-NetworkExpertPidFile {
  return Join-Path (Get-NetworkExpertRoot) ".networkexpert-server.pid"
}

function Get-NetworkExpertLogFile {
  return Join-Path (Get-NetworkExpertRoot) ".networkexpert-server.log"
}
