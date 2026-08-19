#!/usr/bin/env bash
# Verifica que hotclick.lat pasa por Cloudflare (header cf-ray).
set -euo pipefail

URL="${1:-https://hotclick.lat/api/health}"
DOMAIN="${URL#*://}"
DOMAIN="${DOMAIN%%/*}"

echo "=== Verificación Cloudflare ==="
echo "URL: $URL"
echo ""

HEADERS=$(curl -sI "$URL" 2>/dev/null || true)

if echo "$HEADERS" | grep -qi "^cf-ray:"; then
    RAY=$(echo "$HEADERS" | grep -i "^cf-ray:" | head -1 | tr -d '\r')
    echo "  ✓ Cloudflare activo — $RAY"
else
    echo "  ✗ cf-ray ausente — el tráfico NO pasa por Cloudflare aún"
    echo "    Verificar: DNS proxied (nube naranja) y nameservers en Cloudflare"
    exit 1
fi

if echo "$HEADERS" | grep -qi "^cf-cache-status:"; then
    CACHE=$(echo "$HEADERS" | grep -i "^cf-cache-status:" | head -1 | tr -d '\r')
    echo "  ✓ $CACHE"
fi

RESOLVED=$(dig +short "$DOMAIN" 2>/dev/null | head -1)
if [[ -n "$RESOLVED" ]]; then
    echo "  DNS $DOMAIN → $RESOLVED"
    if [[ "$RESOLVED" == "18.227.68.15" ]]; then
        echo "  ⚠ DNS apunta directo al EC2 — activar proxy (nube naranja) en Cloudflare"
        exit 1
    else
        echo "  ✓ DNS no expone IP directa del EC2"
    fi
fi

STATUS=$(curl -sI -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || echo "000")
[[ "$STATUS" == "200" ]] && echo "  ✓ HTTPS responde $STATUS" || echo "  ✗ HTTPS responde $STATUS"

echo ""
echo "OK — Cloudflare configurado."
