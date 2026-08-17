# Script de desarrollo local — carga Hot_click_outlet/.env (nunca pongas secretos acá).
# Uso: .\dev.ps1

$envFile = Join-Path $PSScriptRoot "Hot_click_outlet\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "Falta Hot_click_outlet\.env. Copia .env.example y rellena los valores." -ForegroundColor Red
    exit 1
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { return }
    $name = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
    Set-Item -Path "Env:$name" -Value $value
}

if (-not $env:CORS_ALLOWED_ORIGINS) {
    $env:CORS_ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:8080"
}
if (-not $env:APP_URL) {
    $env:APP_URL = "http://localhost:3000"
}

Write-Host "Variables cargadas desde .env. Iniciando backend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\Hot_click_outlet"
& "$PSScriptRoot\maven\bin\mvn.cmd" spring-boot:run
