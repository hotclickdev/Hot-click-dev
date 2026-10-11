#!/usr/bin/env bash
# Verificación off-site del backup de Postgres (lado CI).
#   fetch-latest <dir>   baja el .dump.age más nuevo de BACKUP_S3_URI (falla si tiene > MAX_AGE_HOURS)
#   decrypt <in> <out>   descifra con la identidad age de BACKUP_AGE_IDENTITY (secreto)
#   verify <dump>        tamaño mínimo + pg_restore --list + TABLE DATA de las tablas clave + lectura completa
# Falla fuerte si faltan secretos: nunca "pasa" sin haber visto un backup real.
set -euo pipefail

MIN_BYTES="${MIN_BYTES:-65536}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"
REQUIRED_TABLES="${REQUIRED_TABLES:-hot_click_usuario_tb hot_click_pedido_tb hot_click_producto_tb hot_click_pago_tb}"
OUT="${GITHUB_OUTPUT:-/dev/null}"

fail() { echo "::error::BACKUP FAIL: $*"; echo "BACKUP FAIL: $*" >&2; exit 1; }

need() {
  local v
  for v in "$@"; do
    [[ -n "${!v:-}" ]] || fail "falta $v (secreto/variable del repo). No se verifica nada sin él."
  done
}

fetch_latest() {
  local dir="$1" key ts age_h
  need BACKUP_S3_URI AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
  local bucket="${BACKUP_S3_URI#s3://}"; bucket="${bucket%%/*}"
  local prefix="${BACKUP_S3_URI#s3://"$bucket"}"; prefix="${prefix#/}"; prefix="${prefix%/}"
  # listado del mes actual y del anterior (el día 1 el último puede estar en el mes previo)
  local listado="" p
  for p in "$(date -u +%Y/%m)" "$(date -u -d "$(date -u +%Y-%m-01) -1 day" +%Y/%m)"; do
    listado+="$(aws s3api list-objects-v2 --bucket "$bucket" --prefix "${prefix:+$prefix/}$p/" \
      --query 'Contents[].[LastModified,Key]' --output text 2>/dev/null | grep -v '^None$' || true)"$'\n'
  done
  read -r ts key < <(printf '%s' "$listado" | grep '\.dump\.age$' | sort -r | head -n1) || true
  [[ -n "${key:-}" ]] || fail "no hay ningún .dump.age en ${BACKUP_S3_URI} para este mes ni el anterior"
  age_h=$(( ( $(date -u +%s) - $(date -u -d "$ts" +%s) ) / 3600 ))
  (( age_h <= MAX_AGE_HOURS )) || fail "el último backup ($key) tiene ${age_h} h (> ${MAX_AGE_HOURS} h): el timer del server no está subiendo"
  mkdir -p "$dir"
  local dest; dest="$dir/$(basename "$key")"
  aws s3 cp --only-show-errors "s3://$bucket/$key" "$dest"
  echo "file=$dest" >> "$OUT"
  echo "key=$key" >> "$OUT"
  echo "Último backup: $key (${age_h} h, $(stat -c%s "$dest") bytes cifrado)"
}

decrypt() {
  local in="$1" out="$2" id
  need BACKUP_AGE_IDENTITY
  id="$(mktemp)"; trap 'rm -f "$id"' RETURN
  printf '%s\n' "$BACKUP_AGE_IDENTITY" > "$id"
  age -d -i "$id" -o "$out" "$in" || fail "no se pudo descifrar $in con BACKUP_AGE_IDENTITY"
  echo "dump=$out" >> "$OUT"
}

verify() {
  local dump="$1" size list t
  [[ -f "$dump" ]] || fail "dump no encontrado: $dump"
  size=$(stat -c%s "$dump")
  (( size >= MIN_BYTES )) || fail "dump de $size bytes (< $MIN_BYTES)"
  list="$(pg_restore --list "$dump")" || fail "pg_restore --list no puede leer el dump (corrupto o versión de cliente vieja)"
  for t in $REQUIRED_TABLES; do
    grep -Eq "TABLE DATA public $t " <<<"$list" || fail "el dump no trae datos de $t"
  done
  # El TOC va al principio: un dump truncado pasa --list. Leerlo entero detecta el corte.
  pg_restore -f /dev/null "$dump" || fail "el dump está truncado o corrupto (pg_restore no puede leer los datos)"
  echo "verify OK: $size bytes, $(grep -c 'TABLE DATA' <<<"$list") tablas con datos"
}

case "${1:-}" in
  fetch-latest) fetch_latest "${2:?dir}" ;;
  decrypt)      decrypt "${2:?in}" "${3:?out}" ;;
  verify)       verify "${2:?dump}" ;;
  *) echo "uso: $0 fetch-latest <dir> | decrypt <in> <out> | verify <dump>" >&2; exit 2 ;;
esac
