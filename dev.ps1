# Script de desarrollo local — correr desde c:\proyecto-2026
# Uso: .\dev.ps1

# ── Base de datos (Supabase) ────────────────────────────────────────────
$env:DB_URL      = "jdbc:postgresql://aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0"
$env:DB_USERNAME = "postgres.nkevwfcjhjaawtdqquns"
$env:DB_PASSWORD = "HotClick2026!"

# ── JWT ─────────────────────────────────────────────────────────────────
# Cualquier string largo sirve para dev (mínimo 32 caracteres)
$env:JWT_SECRET  = "hotclick-dev-secret-key-2026-local-only-32chars"

# ── CORS ────────────────────────────────────────────────────────────────
$env:CORS_ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:8080"

# ── Supabase Storage ────────────────────────────────────────────────────
$env:SUPABASE_URL         = "https://nkevwfcjhjaawtdqquns.supabase.co"
$env:SUPABASE_SERVICE_KEY = "REEMPLAZA_CON_TU_SUPABASE_SERVICE_KEY"

# ── SendGrid ─────────────────────────────────────────────────────────────
# Pon tu API key real de SendGrid (o una vacía para que no falle el inicio)
$env:SENDGRID_API_KEY = "SG.REEMPLAZA_CON_TU_KEY"

# ── PayPal Sandbox ───────────────────────────────────────────────────────
# Obtén estas keys en: https://developer.paypal.com/dashboard/applications/sandbox
$env:PAYPAL_CLIENT_ID     = "REEMPLAZA_CON_TU_CLIENT_ID_SANDBOX"
$env:PAYPAL_CLIENT_SECRET = "REEMPLAZA_CON_TU_CLIENT_SECRET_SANDBOX"
$env:PAYPAL_SSL_SKIP_VERIFY = "true"   # Windows: omite verificación SSL para sandbox

# ── Google Vision / Gemini ───────────────────────────────────────────────
# Obtén tu key en: https://aistudio.google.com/app/apikey
$env:GOOGLE_VISION_API_KEY = "REEMPLAZA_CON_TU_GOOGLE_API_KEY"

# ── App URL ──────────────────────────────────────────────────────────────
$env:APP_URL = "http://localhost:3000"

# ────────────────────────────────────────────────────────────────────────
Write-Host "Variables cargadas. Iniciando backend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\Hot_click_outlet"
& "$PSScriptRoot\maven\bin\mvn.cmd" spring-boot:run
