#!/usr/bin/env bash
# El drill de GitHub solo usa el fixture sintético.
# Un dump de producción no se baja a Actions (repo público, Ley 8968).
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

echo "S8 FAIL: este job no descarga dumps de producción." >&2
echo "El backup diario sube pg_dump -Fc a S3 privado desde Lightsail." >&2
echo "Para probar el mecanismo: workflow_dispatch con use_fixture=true." >&2
echo "Para restaurar de verdad: scripts/backup/RESTORE.md en el host." >&2
exit 1
