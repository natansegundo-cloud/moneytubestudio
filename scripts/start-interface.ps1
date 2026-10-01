$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $projectRoot "interface")
npm run dev -- --host 127.0.0.1 --port 4173
