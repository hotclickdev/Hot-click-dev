#!/usr/bin/env bash
# Backup diario de Postgres (Lightsail, Docker) -> pg_dump -Fc -> verificación -> age -> S3.
# Lo corre el timer systemd hotclick-db-backup.timer. Cualquier fallo sale con código != 0
# (systemd lo marca failed) y avisa por Telegram si hay token configurado.
#
# Config (EnvironmentFile=/etc/hotclick/backup.env, ver backup.env.example):
#   PG_CONTAINER        contenedor de Postgres (default hotclick-postgres; vacío = pg_dump local, solo tests)
#   PG_DB, PG_USER      base y usuario dentro del contenedor
#   AGE_RECIPIENT       clave PÚBLICA age (age1...). La privada nunca está en el server.
#   BACKUP_S3_URI       s3://bucket/prefijo   (clave IAM solo PutObject sobre ese prefijo)
#   BACKUP_LOCAL_DIR    solo tests: copia local en vez de S3 (excluyente con BACKUP_S3_URI)
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

if [[ -z "${BACKUP_S3_URI:-}" && -z "${BACKUP_LOCAL_DIR:-}" ]]; then
  echo "FAIL: falta BACKUP_S3_URI (destino off-server)" >&2; exit 1
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

# 5. Subida off-server. Ruta por fecha; la clave IAM no puede listar, leer ni borrar.
KEY="$(date -u +%Y/%m)/hotclick-$STAMP.dump.age"
if [[ -n "${BACKUP_S3_URI:-}" ]]; then
  aws s3 cp --only-show-errors "$ENC" "${BACKUP_S3_URI%/}/$KEY"
else
  mkdir -p "$BACKUP_LOCAL_DIR/$(dirname "$KEY")"
  cp "$ENC" "$BACKUP_LOCAL_DIR/$KEY"
fi
echo "OK backup $KEY ($SIZE bytes sin cifrar, $(stat -c%s "$ENC") cifrado)"
