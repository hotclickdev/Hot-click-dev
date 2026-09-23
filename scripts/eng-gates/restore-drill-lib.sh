#!/usr/bin/env bash
# Funciones de S8. Sourced por restore-drill.sh y por tests.
# No imprime passwords. No usa SUPABASE_* como destino.

TABLAS_ESPERADAS=(
  hot_click_usuario_tb
  hot_click_pedido_tb
  hot_click_producto_tb
)

restore_drill_redact() {
  echo "$1" | sed -E 's#(://[^:/@]+:)[^@/]+@#\1***@#g'
}

restore_drill_is_prod_url() {
  local url="${1:-}"
  echo "$url" | grep -qiE 'supabase\.|pooler\.supabase|rds\.amazonaws|render\.com|neon\.tech|hotclick\.lat|amazonaws\.com'
}

restore_drill_is_local_url() {
  local url="${1:-}"
  [[ -n "$url" ]] || return 1
  restore_drill_is_prod_url "$url" && return 1
  echo "$url" | grep -qiE '@(localhost|127\.0\.0\.1|postgres|postgres\.)[^/]*[:/]'
}

restore_drill_require_throwaway() {
  local url="${DATABASE_URL:-}"
  if [[ -z "$url" ]]; then
    echo "S8 FAIL: DATABASE_URL vacío. Este job no inventa credenciales y no usa SUPABASE_* como destino." >&2
    exit 1
  fi
  if restore_drill_is_prod_url "$url"; then
    echo "S8 FAIL: DATABASE_URL parece producción ($(restore_drill_redact "$url")). Abortado." >&2
    exit 1
  fi
  if ! restore_drill_is_local_url "$url"; then
    echo "S8 FAIL: DATABASE_URL no es throwaway local ($(restore_drill_redact "$url"))." >&2
    exit 1
  fi
  if [[ "${DRILL_ALLOW_RESTORE:-}" != "1" ]]; then
    echo "S8 FAIL: DRILL_ALLOW_RESTORE=1 es obligatorio para restaurar." >&2
    exit 1
  fi
}

restore_drill_verify() {
  local archivo="$1"
  if [[ -z "$archivo" || ! -f "$archivo" ]]; then
    echo "S8 FAIL: dump no encontrado: ${archivo:-<vacío>}" >&2
    exit 1
  fi
  if [[ "$archivo" != *.gz ]]; then
    echo "S8 FAIL: se espera un .sql.gz" >&2
    exit 1
  fi
  gunzip -t "$archivo"
  local faltantes=()
  local tabla
  for tabla in "${TABLAS_ESPERADAS[@]}"; do
    if ! gzip -dc "$archivo" | grep -q "$tabla"; then
      faltantes+=("$tabla")
    fi
  done
  if (( ${#faltantes[@]} > 0 )); then
    echo "S8 FAIL: faltan tablas en el dump: ${faltantes[*]}" >&2
    exit 1
  fi
  echo "S8 verify OK: gzip íntegro y tablas esperadas mencionadas"
}

restore_drill_restore() {
  local archivo="$1"
  restore_drill_require_throwaway
  restore_drill_verify "$archivo"
  echo "S8 restaurando en destino throwaway (URL redactada: $(restore_drill_redact "$DATABASE_URL"))"
  gzip -dc "$archivo" | psql --quiet --set ON_ERROR_STOP=on "$DATABASE_URL" >/dev/null
}

restore_drill_check_tables() {
  restore_drill_require_throwaway
  local tabla
  for tabla in "${TABLAS_ESPERADAS[@]}"; do
    if ! psql --quiet --tuples-only --set ON_ERROR_STOP=on "$DATABASE_URL" \
      -c "SELECT to_regclass('public.${tabla}');" | grep -q "$tabla"; then
      echo "S8 FAIL: tabla ${tabla} no existe tras el restore" >&2
      exit 1
    fi
  done
  echo "S8 tables OK: ${TABLAS_ESPERADAS[*]}"
}
