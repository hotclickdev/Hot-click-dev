#!/usr/bin/env bash
# Backup diario de Postgres (Lightsail, Docker) -> pg_dump -Fc -> verificación -> age -> Google Drive (rclone).
# Lo corre el timer systemd hotclick-db-backup.timer. Cualquier fallo sale con código != 0
# (systemd lo marca failed) y avisa por Telegram si hay token configurado.
#
# Config (EnvironmentFile=/etc/hotclick/backup.env, ver backup.env.example):
#   PG_CONTAINER        contenedor de Postgres (default hotclick-postgres; vacío = pg_dump local, solo tests)
#   PG_DB, PG_USER      base y usuario dentro del contenedor
#   AGE_RECIPIENT       clave PÚBLICA age (age1...). La privada nunca está en el server.
#   GDRIVE_FOLDER_ID + credenciales de Drive (ver gdrive-rclone-env.sh: OAuth recomendado o SA en unidad compartida)
#   RETENTION_DAYS      borra backups hotclick-*.dump.age más viejos que esto (default 35). Nada más.
#   MIN_BYTES           tamaño mínimo del dump (default 65536)
#   REQUIRED_TABLES     tablas que deben tener TABLE DATA en el dump
#   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID  opcionales, para el aviso de fallo
set -euo pipefail
umask 077

PG_CONTAINER="${PG_CONTAINER-hotclick-postgres}"
PG_DB="${PG_DB:-hotclick}"
PG_USER="${PG_USER:?PG_USER requerido}"
AGE_RECIPIENT="${AGE_RECIPIENT:?AGE_RECIPIENT requerido (clave pública age1...)}"
MIN_BYTES="${MIN_BYTES:-65536}"
REQUIRED_TABLES="${REQUIRED_TABLES:-hot_click_usuario_tb hot_click_pedido_tb hot_click_producto_tb hot_click_pago_tb}"
WORK_DIR="${WORK_DIR:-/var/tmp/hotclick-backup}"
RETENTION_DAYS="${RETENTION_DAYS:-35}"
LIB="${GDRIVE_LIB:-$(dirname "$(readlink -f "$0")")/gdrive-rclone-env.sh}"

# shellcheck source=deploy/backup/gdrive-rclone-env.sh
source "$LIB"
gdrive_rclone_env   # falla si faltan GDRIVE_FOLDER_ID o credenciales (destino off-server obligatorio)
if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || (( RETENTION_DAYS < 7 )); then
  echo "FAIL: RETENTION_DAYS inválido (mínimo 7)" >&2; exit 1
fi
if [[ "$AGE_RECIPIENT" != age1* ]]; then
  echo "FAIL: AGE_RECIPIENT no es una clave pública age (age1...)" >&2; exit 1
fi

avisar_fallo() {
  local rc=$? linea=${1:-?}
  local msg
  msg="❌ Backup Postgres FALLÓ en $(hostname) (línea $linea, código $rc) $(date -u +%FT%TZ)"
  echo "$msg" >&2
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    curl -fsS -m 20 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      --data-urlencode chat_id="$TELEGRAM_CHAT_ID" --data-urlencode text="$msg" >/dev/null || true
  fi
  exit "$rc"
}
trap 'avisar_fallo $LINENO' ERR

pg() {  # corre un binario de Postgres dentro del contenedor (o local si PG_CONTAINER vacío)
  if [[ -n "$PG_CONTAINER" ]]; then docker exec -i "$PG_CONTAINER" "$@"; else "$@"; fi
}

mkdir -p "$WORK_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP="$WORK_DIR/hotclick-$STAMP.dump"
ENC="$DUMP.age"
trap 'rm -f "$DUMP" "$ENC" "$WORK_DIR/list.txt"' EXIT

# 1. Dump en formato custom (comprimido). pipefail: si pg_dump falla, falla todo.
pg pg_dump -U "$PG_USER" -d "$PG_DB" -Fc --no-owner --no-acl > "$DUMP"

# 2. Tamaño mínimo
SIZE="$(stat -c%s "$DUMP")"
if (( SIZE < MIN_BYTES )); then
  echo "FAIL: dump de $SIZE bytes (< $MIN_BYTES)" >&2; false
fi

# 3. Integridad: pg_restore --list tiene que leer el TOC completo y traer los datos clave
pg pg_restore --list < "$DUMP" > "$WORK_DIR/list.txt"
for t in $REQUIRED_TABLES; do
  if ! grep -Eq "TABLE DATA public $t " "$WORK_DIR/list.txt"; then
    echo "FAIL: el dump no trae datos de $t" >&2; false
  fi
done

# 3b. Lectura completa: el TOC está al principio, así que --list no detecta un dump truncado.
#     Restaurar a /dev/null descomprime todos los bloques de datos.
pg pg_restore -f /dev/null < "$DUMP"

# 4. Cifrado con la clave pública (solo el dueño de la privada puede leerlo)
age -r "$AGE_RECIPIENT" -o "$ENC" "$DUMP"
rm -f "$DUMP"

# 5. Subida a Google Drive (carpeta GDRIVE_FOLDER_ID). Nombre plano con fecha UTC.
NAME="hotclick-$STAMP.dump.age"
rclone copyto --retries 3 "$ENC" "gd:$NAME"
# Confirmar que quedó arriba con el mismo tamaño
REMOTE_SIZE="$(rclone lsf gd: --files-only --max-depth 1 --format s --include "$NAME")"
if [[ "$REMOTE_SIZE" != "$(stat -c%s "$ENC")" ]]; then
  echo "FAIL: $NAME no está en Drive o tiene otro tamaño (${REMOTE_SIZE:-ausente})" >&2; false
fi

# 6. Retención: solo archivos hotclick-*.dump.age con más de RETENTION_DAYS días. Nunca otros archivos.
#    (Drive los manda a la papelera; Google la vacía sola a los 30 días.)
rclone delete gd: --max-depth 1 --include 'hotclick-*.dump.age' --min-age "${RETENTION_DAYS}d"
echo "OK backup $NAME ($SIZE bytes sin cifrar, $(stat -c%s "$ENC") cifrado); retención ${RETENTION_DAYS} d"
