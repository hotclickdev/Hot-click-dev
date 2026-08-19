#!/usr/bin/env bash
# Verifica headers de seguridad y TLS básico en producción.
# Uso: scripts/check-security-headers.sh [URL]
# Default: https://hotclick.lat/api/health

set -euo pipefail

URL="${1:-https://hotclick.lat/api/health}"
BASE_URL="${URL%/api/health}"
BASE_URL="${BASE_URL%/}"
HTTP_URL="${BASE_URL/https:/http:}"

PASS=0
FAIL=0
WARN=0

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
warn() { echo "  ⚠ $1"; WARN=$((WARN + 1)); }

header_val() {
    curl -sI "$1" 2>/dev/null | grep -i "^$2:" | head -1 | cut -d' ' -f2- | tr -d '\r'
}

echo "=== Security headers check ==="
echo "URL: $URL"
echo ""

# HTTPS response
STATUS=$(curl -sI -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || echo "000")
if [[ "$STATUS" == "200" ]]; then
    pass "HTTPS responde $STATUS"
else
    fail "HTTPS responde $STATUS (esperado 200)"
fi

# HSTS
HSTS=$(header_val "$URL" "strict-transport-security")
if [[ -n "$HSTS" ]]; then
    pass "Strict-Transport-Security presente"
    [[ "$HSTS" == *preload* ]] && pass "HSTS incluye preload" || warn "HSTS sin preload"
else
    fail "Strict-Transport-Security ausente"
fi

# X-Content-Type-Options
XCTO=$(header_val "$URL" "x-content-type-options")
[[ "$XCTO" == "nosniff" ]] && pass "X-Content-Type-Options: nosniff" || fail "X-Content-Type-Options ausente o incorrecto"

# X-Frame-Options
XFO=$(header_val "$URL" "x-frame-options")
[[ -n "$XFO" ]] && pass "X-Frame-Options: $XFO" || fail "X-Frame-Options ausente"

# CSP
CSP=$(header_val "$URL" "content-security-policy")
[[ -n "$CSP" ]] && pass "Content-Security-Policy presente" || fail "Content-Security-Policy ausente"

# Referrer-Policy
RP=$(header_val "$URL" "referrer-policy")
[[ -n "$RP" ]] && pass "Referrer-Policy: $RP" || fail "Referrer-Policy ausente"

# HTTP → HTTPS redirect
echo ""
echo "=== HTTP redirect ==="
REDIR=$(curl -sI -o /dev/null -w "%{http_code}" "$HTTP_URL/api/health" 2>/dev/null || echo "000")
LOCATION=$(curl -sI "$HTTP_URL/api/health" 2>/dev/null | grep -i "^location:" | head -1 | tr -d '\r' || true)
if [[ "$REDIR" == "301" || "$REDIR" == "302" ]] && [[ "$LOCATION" == *"https://"* ]]; then
    pass "HTTP redirige a HTTPS ($REDIR → $LOCATION)"
else
    fail "HTTP no redirige correctamente (status=$REDIR, location=$LOCATION)"
fi

# TLS certificate expiry
echo ""
echo "=== TLS certificate ==="
HOST=$(echo "$BASE_URL" | sed -E 's|https?://||' | cut -d/ -f1)
CERT_INFO=$(echo | openssl s_client -connect "${HOST}:443" -servername "$HOST" 2>/dev/null \
    | openssl x509 -noout -dates -issuer 2>/dev/null || true)
if [[ -n "$CERT_INFO" ]]; then
    pass "Certificado TLS obtenido"
    echo "$CERT_INFO" | sed 's/^/    /'
    NOT_AFTER=$(echo "$CERT_INFO" | grep notAfter | cut -d= -f2)
    if [[ -n "$NOT_AFTER" ]]; then
        EXPIRY_EPOCH=$(date -d "$NOT_AFTER" +%s 2>/dev/null || true)
        NOW_EPOCH=$(date +%s)
        if [[ -n "${EXPIRY_EPOCH:-}" ]]; then
            DAYS=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
            if [[ $DAYS -gt 14 ]]; then
                pass "Certificado válido por $DAYS días más"
            else
                warn "Certificado vence en $DAYS días"
            fi
        fi
    fi
else
    fail "No se pudo leer certificado TLS"
fi

# Port 8080 exposure check (optional, uses known EC2 IP)
echo ""
echo "=== Puerto 8080 (bypass Nginx) ==="
EC2_IP="${EC2_IP:-18.227.68.15}"
PORT8080=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" "http://${EC2_IP}:8080/api/health" 2>/dev/null || echo "000")
if [[ "$PORT8080" == "000" || "$PORT8080" == "000000" ]]; then
    pass "Puerto 8080 no accesible desde Internet"
elif [[ "$PORT8080" == "200" ]]; then
    fail "Puerto 8080 EXPUESTO públicamente — cerrar security group y bind localhost"
else
    warn "Puerto 8080 responde con status $PORT8080"
fi

echo ""
echo "=== Resumen ==="
echo "  Pass: $PASS | Fail: $FAIL | Warn: $WARN"
if [[ $FAIL -gt 0 ]]; then
    exit 1
fi
exit 0
