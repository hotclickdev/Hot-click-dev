#!/usr/bin/env bash
# Baja el último artifact de "Daily DB Backup" o usa el fixture sintético.
# No inventa SUPABASE_* . No escribe a prod.
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

if [[ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" || -z "${GITHUB_REPOSITORY:-}" ]]; then
  echo "S8 FAIL: no hay token/repo para bajar artifacts." >&2
  echo "Este job NO inventa SUPABASE_BACKUP_URL / SUPABASE_DB_PASSWORD y NUNCA escribe a producción." >&2
  echo "Corré 'Daily DB Backup' (requiere esos secretos) o dispatch con use_fixture=true." >&2
  exit 1
fi

export GH_TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"

RUN_ID="$(gh run list --repo "$GITHUB_REPOSITORY" --workflow="Daily DB Backup" --branch=master --status=success --limit=1 --json databaseId --jq '.[0].databaseId // empty')"
if [[ -z "$RUN_ID" ]]; then
  echo "S8 FAIL: no hay corrida exitosa de Daily DB Backup." >&2
  echo "Este job NO inventa credenciales de backup. Si faltan SUPABASE_BACKUP_URL / SUPABASE_DB_PASSWORD, backup.yml falla — no se fabrican acá." >&2
  echo "Alternativa de mecanismo: workflow_dispatch con use_fixture=true." >&2
  exit 1
fi

DIR="${RUNNER_TEMP:-/tmp}/backup-art-$RUN_ID"
mkdir -p "$DIR"
if ! gh run download "$RUN_ID" --repo "$GITHUB_REPOSITORY" --dir "$DIR" --name "db-backup-$RUN_ID"; then
  echo "S8 aviso: artifact db-backup-$RUN_ID no encontrado; intento todos los artifacts del run."
  gh run download "$RUN_ID" --repo "$GITHUB_REPOSITORY" --dir "$DIR" || true
fi

FILE="$(find "$DIR" -name '*.sql.gz' | head -n 1 || true)"
if [[ -z "$FILE" ]]; then
  echo "S8 FAIL: run $RUN_ID no tiene un .sql.gz. Backup incompleto o artifact expirado." >&2
  exit 1
fi

echo "file=$FILE" >> "$OUT"
echo "source=artifact-$RUN_ID" >> "$OUT"
echo "S8 dump listo desde artifact run $RUN_ID"
