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
  if [[ "$archivo" == *.dump ]]; then
    restore_drill_verify_custom "$archivo"
    return
  fi
  if [[ "$archivo" != *.gz ]]; then
    echo "S8 FAIL: se espera un .dump (pg_dump -Fc) o un .sql.gz" >&2
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

# Dump en formato custom (pg_dump -Fc, el que sube el server): el TOC tiene que leerse entero
# y traer TABLE DATA de las tablas esperadas.
restore_drill_verify_custom() {
  local archivo="$1" lista tabla
  if ! lista="$(pg_restore --list "$archivo")"; then
    echo "S8 FAIL: pg_restore --list no puede leer $archivo" >&2
    exit 1
  fi
  for tabla in "${TABLAS_ESPERADAS[@]}"; do
    if ! grep -Eq "TABLE DATA public ${tabla} " <<<"$lista"; then
      echo "S8 FAIL: el dump no trae datos de ${tabla}" >&2
      exit 1
    fi
  done
  if ! pg_restore -f /dev/null "$archivo"; then
    echo "S8 FAIL: $archivo está truncado o corrupto" >&2
    exit 1
  fi
  echo "S8 verify OK: TOC legible, datos completos y tablas esperadas"
}

restore_drill_restore() {
  local archivo="$1"
  restore_drill_require_throwaway
  restore_drill_verify "$archivo"
  echo "S8 restaurando en destino throwaway (URL redactada: $(restore_drill_redact "$DATABASE_URL"))"
  if [[ "$archivo" == *.dump ]]; then
    pg_restore --no-owner --no-acl --exit-on-error --dbname "$DATABASE_URL" "$archivo"
  else
    gzip -dc "$archivo" | psql --quiet --set ON_ERROR_STOP=on "$DATABASE_URL" >/dev/null
  fi
}

# Conteo de filas de las tablas clave. Con DRILL_REQUIRE_ROWS=1 (dump real de prod) cada tabla de
# DRILL_NONEMPTY tiene que tener al menos una fila; el fixture sintético no lo exige.
restore_drill_sanity() {
  restore_drill_require_throwaway
  local tabla n
  local nonempty="${DRILL_NONEMPTY:-hot_click_usuario_tb hot_click_producto_tb}"
  for tabla in "${TABLAS_ESPERADAS[@]}"; do
    n="$(psql --quiet --tuples-only --no-align --set ON_ERROR_STOP=on "$DATABASE_URL" \
      -c "SELECT count(*) FROM public.${tabla};")"
    echo "S8 filas ${tabla}: ${n}"
    if [[ "${DRILL_REQUIRE_ROWS:-0}" == "1" && " ${nonempty} " == *" ${tabla} "* && "${n}" -lt 1 ]]; then
      echo "S8 FAIL: ${tabla} quedó vacía tras el restore" >&2
      exit 1
    fi
  done
  echo "S8 sanity OK"
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
