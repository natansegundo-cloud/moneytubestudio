$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$engineRoot = Join-Path $projectRoot "engine\MoneyPrinterTurbo"
$python = Join-Path $engineRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
    throw "MPT virtual environment not found: $python"
}

Write-Output "Python:"
& $python --version

Write-Output "FFmpeg:"
ffmpeg -version | Select-Object -First 1

Push-Location $engineRoot
try {
    Write-Output "Imports:"
    & $python -c "import app, fastapi, edge_tts, moviepy; print('imports=ok')"
    if ($LASTEXITCODE -ne 0) {
        throw "MPT imports failed with exit code $LASTEXITCODE"
    }

    Write-Output "CLI:"
    $helpOutput = & $python "cli.py" --help 2>&1
    $cliExit = $LASTEXITCODE
    $helpOutput | Select-Object -First 8
    if ($cliExit -ne 0) {
        throw "MPT CLI help failed with exit code $cliExit"
    }
} finally {
    Pop-Location
}

Write-Output "MPT preflight passed."
