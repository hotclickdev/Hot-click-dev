#!/usr/bin/env bash
# Verificación off-site del backup de Postgres (lado CI).
#   fetch-latest <dir>   baja de Google Drive (rclone) el hotclick-*.dump.age más nuevo (falla si tiene > MAX_AGE_HOURS)
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
  local dir="$1" name epoch age_h
  # shellcheck source=deploy/backup/gdrive-rclone-env.sh
  source "$(dirname "$0")/../../deploy/backup/gdrive-rclone-env.sh"
  gdrive_rclone_env || fail "configuración de Google Drive incompleta (ver arriba)"
  name="$(gdrive_latest)" || fail "no se pudo listar la carpeta de Drive (credenciales o GDRIVE_FOLDER_ID)"
  [[ -n "$name" ]] || fail "no hay ningún hotclick-*.dump.age en la carpeta de Drive"
  epoch="$(gdrive_epoch_de "$name")" || fail "nombre de backup inesperado: $name"
  age_h=$(( ( $(date -u +%s) - epoch ) / 3600 ))
  (( age_h <= MAX_AGE_HOURS )) || fail "el último backup ($name) tiene ${age_h} h (> ${MAX_AGE_HOURS} h): el timer del server no está subiendo"
  mkdir -p "$dir"
  rclone copyto --retries 3 "gd:$name" "$dir/$name" || fail "no se pudo bajar $name"
  echo "file=$dir/$name" >> "$OUT"
  echo "key=$name" >> "$OUT"
  echo "Último backup: $name (${age_h} h, $(stat -c%s "$dir/$name") bytes cifrado)"
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
