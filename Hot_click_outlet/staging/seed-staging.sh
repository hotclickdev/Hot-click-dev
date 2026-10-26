#!/usr/bin/env bash
# Carga datos de PRUEBA en la base de staging (catálogo ficticio, sin datos reales).
# Se niega si el .env no es de staging o si la base ya tiene pedidos.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$DIR/.env.staging}"
# shellcheck source-path=SCRIPTDIR source=lib-staging.sh
. "$DIR/lib-staging.sh"
validar_env_staging "$ENV_FILE"
DB_USER="$(leer_var "$ENV_FILE" DB_USERNAME)"
DB_NAME="$(leer_var "$ENV_FILE" POSTGRES_DB)"; DB_NAME="${DB_NAME:-hotclick_staging}"
PSQL=(docker exec -i hotclick-staging-postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME")
pedidos="$("${PSQL[@]}" -tAc "SELECT count(*) FROM hot_click_pedido_tb" 2>/dev/null || echo 0)"
if [ "${pedidos:-0}" != "0" ]; then
  echo "seed: la base ya tiene pedidos; no se siembra." >&2; exit 3
fi
for f in seed_marcas_manual.sql seed_catalogo_manual.sql; do
  echo "seed: $f"
  "${PSQL[@]}" < "$DIR/../../$f"
done
echo "seed: OK"
