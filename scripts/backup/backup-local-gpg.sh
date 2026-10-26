#!/usr/bin/env bash
# ============================================================
# HOTCLICK — Respaldo local cifrado (pg_dump + GPG, sin AWS)
# ============================================================
# Hace pg_dump del Postgres de Docker (o de PG* locales), lo cifra con la
# llave PÚBLICA de "HotClick Backups" y lo guarda en BACKUP_DIR (700/600).
# Nunca escribe el dump en claro a disco: pg_dump | gzip | gpg en tubería.
# Rota: conserva los últimos BACKUP_KEEP y borra los más viejos.
# No se programa solo: ver scripts/backup/README.md (ejemplo de cron).
#
# Variables:
#   BACKUP_GPG_RECIPIENT  (obligatoria) fingerprint o uid de la llave pública
#                         ya importada (p. ej. "HotClick Backups").
#   BACKUP_GPG_PUBKEY     (opcional) ruta a un .asc público; se importa en un
#                         GNUPGHOME temporal y se usa solo ese llavero.
#   BACKUP_DIR            (def. /var/backups/hotclick)
#   BACKUP_KEEP           (def. 7) cuántos respaldos conservar
#   PG_DUMP_CMD           (def. "docker exec hotclick-postgres pg_dump -U $DB_USERNAME -d ${POSTGRES_DB:-hotclick} -Fc")
#                         comando que escribe el dump a stdout.
set -euo pipefail
umask 077

die() { echo "backup: ERROR: $*" >&2; exit 1; }

RECIPIENT="${BACKUP_GPG_RECIPIENT:-}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hotclick}"
KEEP="${BACKUP_KEEP:-7}"

[[ -n "$RECIPIENT" ]] || die "falta BACKUP_GPG_RECIPIENT (llave pública de HotClick Backups)"
[[ "$KEEP" =~ ^[1-9][0-9]*$ ]] || die "BACKUP_KEEP debe ser entero >= 1"
command -v gpg >/dev/null || die "gpg no está instalado"
case "${PG_DUMP_CMD:-} ${BACKUP_DIR}" in *aws\ *|*s3://*) die "este respaldo es local; no usa AWS";; esac

if [[ -z "${PG_DUMP_CMD:-}" ]]; then
  [[ -n "${DB_USERNAME:-}" ]] || die "falta DB_USERNAME o PG_DUMP_CMD"
  PG_DUMP_CMD="docker exec hotclick-postgres pg_dump -U ${DB_USERNAME} -d ${POSTGRES_DB:-hotclick} -Fc"
fi

TMP_GNUPG=""
cleanup() {
  [[ -n "${PARTIAL:-}" && -e "$PARTIAL" ]] && rm -f "$PARTIAL"
  [[ -n "$TMP_GNUPG" ]] && rm -rf "$TMP_GNUPG"
  return 0
}
trap cleanup EXIT

GPG=(gpg --batch --yes --no-tty --trust-model always)
if [[ -n "${BACKUP_GPG_PUBKEY:-}" ]]; then
  [[ -r "$BACKUP_GPG_PUBKEY" ]] || die "no se puede leer BACKUP_GPG_PUBKEY"
  grep -q "PRIVATE KEY" "$BACKUP_GPG_PUBKEY" && die "BACKUP_GPG_PUBKEY parece una llave PRIVADA; usá solo la pública"
  TMP_GNUPG="$(mktemp -d)"
  "${GPG[@]}" --homedir "$TMP_GNUPG" --import "$BACKUP_GPG_PUBKEY" >/dev/null 2>&1 || die "no se pudo importar la llave pública"
  GPG+=(--homedir "$TMP_GNUPG")
fi
"${GPG[@]}" --list-keys "$RECIPIENT" >/dev/null 2>&1 || die "no encuentro la llave pública '$RECIPIENT' en el llavero"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FINAL="$BACKUP_DIR/hotclick-$STAMP.dump.gz.gpg"
PARTIAL="$FINAL.partial"

# Tubería: el texto plano solo existe en memoria. pipefail hace fallar si cualquier etapa falla.
if ! bash -c "$PG_DUMP_CMD" | gzip -c | "${GPG[@]}" --encrypt --recipient "$RECIPIENT" --output "$PARTIAL"; then
  die "falló pg_dump o el cifrado; no se guardó nada"
fi
[[ -s "$PARTIAL" ]] || die "el respaldo cifrado quedó vacío"
# Verificación: debe ser un paquete OpenPGP cifrado, no texto plano.
PAQUETES="$("${GPG[@]}" --list-packets "$PARTIAL" 2>/dev/null || true)"
grep -q "pubkey enc packet" <<<"$PAQUETES" || die "el archivo no quedó cifrado"
chmod 600 "$PARTIAL"
mv "$PARTIAL" "$FINAL"
PARTIAL=""

# Rotación: conservar los últimos KEEP.
mapfile -t ALL < <(ls -1 "$BACKUP_DIR"/hotclick-*.dump.gz.gpg 2>/dev/null | sort)
if (( ${#ALL[@]} > KEEP )); then
  for f in "${ALL[@]:0:${#ALL[@]}-KEEP}"; do rm -f -- "$f"; done
fi

echo "backup: OK $(basename "$FINAL") ($(stat -c %s "$FINAL") bytes); conservados: $(ls -1 "$BACKUP_DIR"/hotclick-*.dump.gz.gpg | wc -l)"
