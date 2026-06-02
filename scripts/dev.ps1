$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"

if (Test-Path $VenvPython) {
    $Python = $VenvPython
} else {
    $Python = "C:\Program Files\Python312\python.exe"
    if (-not (Test-Path $Python)) {
        $Python = "py"
    }
}

$BackendCmd = if ($Python -eq "py") {
    "py -3.12 -m backend.api.server"
} else {
    "& '$Python' -m backend.api.server"
}

$BackendCommand = "& { Set-Location -LiteralPath '$Root'; $BackendCmd }"

Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoExit",
    "-Command",
    $BackendCommand
) -WorkingDirectory $Root

$FrontendDir = Join-Path $Root "frontend"
$FrontendNodeModules = Join-Path $FrontendDir "node_modules"

if (-not (Test-Path $FrontendNodeModules)) {
    Write-Host "Frontend dependencies missing. Installing dependencies in $FrontendDir..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    try {
        npm install
    } catch {
        Write-Error "Failed to install frontend dependencies. Run 'cd frontend; npm install' manually and retry."
        exit 1
    } finally {
        Pop-Location
    }
}

try {
    Start-Sleep -Seconds 3
    Write-Host "Narapangan API: http://127.0.0.1:8000"
    Write-Host "Narapangan Web: http://127.0.0.1:5173"
    Write-Host ""
    Set-Location (Join-Path $Root "frontend")
    npm run dev
}
finally {
    # Backend berjalan di jendela terpisah.
}
