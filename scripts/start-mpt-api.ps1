$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$engineRoot = Join-Path $projectRoot "engine\MoneyPrinterTurbo"
$python = Join-Path $engineRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
    throw "MPT virtual environment not found: $python"
}

Set-Location $engineRoot
& $python main.py
