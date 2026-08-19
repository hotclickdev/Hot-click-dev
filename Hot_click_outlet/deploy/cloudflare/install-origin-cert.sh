#!/usr/bin/env bash
# Instala Cloudflare Origin Certificate en EC2 para modo SSL Full (strict).
# Ejecutar EN EL EC2 después de crear el cert en Cloudflare Dashboard.
#
# Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate
#   Hostnames: hotclick.lat, *.hotclick.lat
#   Validity: 15 years
#
# Pegar el certificado y la clave cuando el script lo pida.

set -euo pipefail

CERT_DIR="/etc/ssl/cloudflare"
CERT_FILE="$CERT_DIR/origin.pem"
KEY_FILE="$CERT_DIR/origin-key.pem"
NGINX_SSL_SNIPPET="/etc/nginx/conf.d/hotclick-ssl.conf"

echo "=== Instalación Origin Certificate (Cloudflare) ==="
echo ""

sudo mkdir -p "$CERT_DIR"
sudo chmod 700 "$CERT_DIR"

if [[ -f "$CERT_FILE" ]]; then
    echo "Ya existe $CERT_FILE"
    read -r -p "¿Sobrescribir? (s/N): " OVERWRITE
    [[ "$OVERWRITE" =~ ^[sS]$ ]] || exit 0
fi

echo ""
echo "Pegá el CERTIFICADO (incluye -----BEGIN CERTIFICATE----- ...):"
echo "Terminá con una línea que diga END (solo END en la línea):"
CERT_TMP=$(mktemp)
while IFS= read -r line; do
    [[ "$line" == "END" ]] && break
    echo "$line" >> "$CERT_TMP"
done
sudo cp "$CERT_TMP" "$CERT_FILE"
rm -f "$CERT_TMP"

echo ""
echo "Pegá la CLAVE PRIVADA (-----BEGIN PRIVATE KEY----- ...):"
echo "Terminá con una línea que diga END:"
KEY_TMP=$(mktemp)
while IFS= read -r line; do
    [[ "$line" == "END" ]] && break
    echo "$line" >> "$KEY_TMP"
done
sudo cp "$KEY_TMP" "$KEY_FILE"
rm -f "$KEY_TMP"

sudo chmod 600 "$CERT_FILE" "$KEY_FILE"

# Snippet que hotclick.conf incluye si existe
sudo tee "$NGINX_SSL_SNIPPET" > /dev/null << EOF
ssl_certificate     $CERT_FILE;
ssl_certificate_key $KEY_FILE;
EOF

echo ""
echo "[install-origin-cert] Certificados guardados en $CERT_DIR"
echo "[install-origin-cert] Snippet SSL: $NGINX_SSL_SNIPPET"
echo ""
echo "Siguiente paso:"
echo "  sudo bash Hot_click_outlet/deploy/ec2/apply-nginx.sh"
echo "  sudo bash Hot_click_outlet/deploy/cloudflare/verify-cloudflare.sh"
