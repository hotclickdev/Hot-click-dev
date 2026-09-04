#!/bin/bash
# Aplica la config Nginx versionada en el EC2 de producción.
# Ejecutar en el EC2 como root o con sudo:
#   cd /home/ec2-user/app && git pull origin master
#   sudo bash Hot_click_outlet/deploy/ec2/apply-nginx.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NGINX_CONF="/etc/nginx/conf.d/hotclick.conf"
SSL_PARAMS="/etc/nginx/conf.d/ssl-params.conf"
CF_REAL_IP="/etc/nginx/conf.d/cloudflare-real-ip.conf"
SSL_SNIPPET="/etc/nginx/conf.d/hotclick-ssl.conf"

echo "[apply-nginx] Repo: $REPO_ROOT"

if ! command -v nginx >/dev/null 2>&1; then
    echo "[apply-nginx] ERROR: nginx no instalado. Instalar con:"
    echo "  sudo dnf install -y nginx certbot python3-certbot-nginx"
    exit 1
fi

sudo mkdir -p /var/www/certbot

sudo cp "$REPO_ROOT/deploy/nginx/ssl-params.conf" "$SSL_PARAMS"
sudo cp "$REPO_ROOT/deploy/nginx/cloudflare-real-ip.conf" "$CF_REAL_IP"

# Solo copiar snippet Let's Encrypt si no existe Origin Certificate de Cloudflare
if [[ ! -f "$SSL_SNIPPET" ]]; then
    sudo cp "$REPO_ROOT/deploy/nginx/hotclick-ssl.conf" "$SSL_SNIPPET"
    echo "[apply-nginx] SSL: Let's Encrypt (default)"
else
    echo "[apply-nginx] SSL: manteniendo $SSL_SNIPPET existente (Cloudflare Origin Certificate)"
fi

sudo cp "$REPO_ROOT/deploy/nginx/hotclick.conf" "$NGINX_CONF"

echo "[apply-nginx] Validando sintaxis..."
sudo nginx -t

echo "[apply-nginx] Recargando nginx..."
sudo systemctl reload nginx

echo "[apply-nginx] OK — config aplicada."
echo "[apply-nginx] Cloudflare activo? sudo bash $REPO_ROOT/deploy/cloudflare/verify-cloudflare.sh"
