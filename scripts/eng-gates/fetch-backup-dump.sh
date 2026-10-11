#!/usr/bin/env bash
# Baja y descifra el último backup off-site (Google Drive, cifrado con age) o usa el fixture sintético.
# No escribe a prod.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${GITHUB_OUTPUT:-/dev/null}"

if [[ "${USE_FIXTURE:-false}" == "true" ]]; then
  DEST="${RUNNER_TEMP:-/tmp}/restore-drill.sql.gz"
  gzip -c "$ROOT/scripts/eng-gates/fixtures/restore-drill-sample.sql" > "$DEST"
  echo "file=$DEST" >> "$OUT"
  echo "source=fixture" >> "$OUT"
  echo "S8 usando fixture sintético (no es un dump de producción)"
  exit 0
fi

# Backup real: el .dump.age más nuevo que subió el timer del server a Google Drive, descifrado acá.
# backup-offsite.sh falla fuerte si faltan GDRIVE_FOLDER_ID, las credenciales de Drive o BACKUP_AGE_IDENTITY.
DIR="${RUNNER_TEMP:-/tmp}/backup-offsite"
FETCH_OUT="$(mktemp)"
GITHUB_OUTPUT="$FETCH_OUT" bash "$ROOT/scripts/eng-gates/backup-offsite.sh" fetch-latest "$DIR"
ENC="$(sed -n 's/^file=//p' "$FETCH_OUT")"
KEY="$(sed -n 's/^key=//p' "$FETCH_OUT")"
DUMP="${ENC%.age}"
GITHUB_OUTPUT=/dev/null bash "$ROOT/scripts/eng-gates/backup-offsite.sh" decrypt "$ENC" "$DUMP"
rm -f "$ENC" "$FETCH_OUT"

echo "file=$DUMP" >> "$OUT"
echo "source=gdrive:$KEY" >> "$OUT"
echo "S8 dump listo: $KEY (descifrado en el runner)"
