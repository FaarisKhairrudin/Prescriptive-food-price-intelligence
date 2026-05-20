$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Python = "C:\Program Files\Python312\python.exe"

if (-not (Test-Path $Python)) {
    $Python = "py"
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
