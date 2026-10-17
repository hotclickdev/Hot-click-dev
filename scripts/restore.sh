#!/usr/bin/env bash
# Restaura un backup cifrado (hotclick-<ts>.dump.age) en una base DESTINO que vos indicás.
# El procedimiento completo está en deploy/backup/README.md. Nunca corras esto contra prod sin OK de HOT_CLICK.
#   uso: scripts/restore.sh <archivo.dump.age> <clave-age-privada> <postgresql://destino>
set -euo pipefail
enc="${1:?archivo .dump.age}"; key="${2:?archivo de clave age privada}"; dest="${3:?URL de la base destino}"
umask 077
dump="$(mktemp --suffix=.dump)"; trap 'rm -f "$dump"' EXIT
age -d -i "$key" -o "$dump" "$enc"
pg_restore --list "$dump" >/dev/null
pg_restore -f /dev/null "$dump"
read -r -p "Restaurar en ${dest%%@*}@… (se escribe en esa base). Escribí RESTAURAR para seguir: " ok
[[ "$ok" == "RESTAURAR" ]] || { echo "cancelado"; exit 1; }
pg_restore --no-owner --no-acl --exit-on-error --dbname "$dest" "$dump"
psql "$dest" -c "SELECT (SELECT count(*) FROM hot_click_usuario_tb) usuarios, (SELECT count(*) FROM hot_click_pedido_tb) pedidos, (SELECT count(*) FROM hot_click_producto_tb) productos;"
