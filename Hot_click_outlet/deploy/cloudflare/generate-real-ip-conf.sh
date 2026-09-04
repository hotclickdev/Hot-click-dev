#!/usr/bin/env bash
# Descarga las IPs oficiales de Cloudflare y regenera cloudflare-real-ip.conf
set -euo pipefail

OUT="$(cd "$(dirname "$0")/../nginx" && pwd)/cloudflare-real-ip.conf"

{
    echo "# IPs de Cloudflare — auto-generado $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "# Regenerar: bash Hot_click_outlet/deploy/cloudflare/generate-real-ip-conf.sh"
    echo ""
    echo "real_ip_header CF-Connecting-IP;"
    echo "real_ip_recursive on;"
    echo ""
    while read -r cidr; do
        [[ -n "$cidr" ]] && echo "set_real_ip_from $cidr;"
    done < <(curl -fsSL https://www.cloudflare.com/ips-v4/)
    while read -r cidr; do
        [[ -n "$cidr" ]] && echo "set_real_ip_from $cidr;"
    done < <(curl -fsSL https://www.cloudflare.com/ips-v6/)
} > "$OUT"

echo "[generate-real-ip-conf] Escrito: $OUT"
