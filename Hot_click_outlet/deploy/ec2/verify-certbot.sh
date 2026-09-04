#!/bin/bash
# Verifica renovación automática de Certbot en EC2.
# Ejecutar en el EC2: sudo bash Hot_click_outlet/deploy/ec2/verify-certbot.sh

set -euo pipefail

DOMAIN="hotclick.lat"
WARN_DAYS=14

echo "[certbot] Dominio: $DOMAIN"

if ! command -v certbot >/dev/null 2>&1; then
    echo "[certbot] ERROR: certbot no instalado."
    exit 1
fi

echo "[certbot] Dry-run de renovación..."
sudo certbot renew --dry-run

if systemctl is-active certbot-renew.timer >/dev/null 2>&1; then
    echo "[certbot] Timer activo:"
    systemctl status certbot-renew.timer --no-pager || true
else
    echo "[certbot] WARNING: certbot-renew.timer no encontrado."
    echo "[certbot] Verificar cron: sudo crontab -l | grep certbot"
fi

CERT_FILE="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
if [[ -f "$CERT_FILE" ]]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    echo "[certbot] Certificado expira: $EXPIRY ($DAYS_LEFT días restantes)"
    if [[ $DAYS_LEFT -lt $WARN_DAYS ]]; then
        echo "[certbot] WARNING: certificado vence en menos de $WARN_DAYS días — renovar manualmente."
        exit 1
    fi
else
    echo "[certbot] WARNING: no se encontró $CERT_FILE"
    exit 1
fi

echo "[certbot] OK"
