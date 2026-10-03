#!/usr/bin/env bash
# D5 — falla si el dump de backup.yml no existe o está vacío.
set -euo pipefail

MODE="${1:-backup-artifact}"
MIN_BYTES="${2:-1024}"

fail() {
  echo "::error::$1"
  echo "$1" >&2
  if [[ -n "${GITHUB_REPOSITORY:-}" && -n "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]]; then
    upsert_issue "$1"
  fi
  exit 1
}

upsert_issue() {
  local body
  body=$(printf '%s\n' \
    "## D5 Backup verdict" \
    "" \
    "$1" \
    "" \
    "Run: ${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID:-unknown}" \
    "" \
    "El dump vive en S3 privado (SSE). Este job no lo descarga." \
    "Secrets de SSH (nombres): \`LIGHTSAIL_SSH_HOST\`, \`LIGHTSAIL_SSH_USER\`, \`LIGHTSAIL_SSH_PRIVATE_KEY\`, \`LIGHTSAIL_SSH_KNOWN_HOSTS\`." \
    "Este job no toca schedulers de negocio (DataRetention, Hacienda, wallet, RAG).")
  local existing
  existing=$(gh issue list --repo "$GITHUB_REPOSITORY" --search "D5 Backup diario" --state open --json number,title -q '.[0].number' || true)
  if [[ -n "$existing" ]]; then
    gh issue comment "$existing" --repo "$GITHUB_REPOSITORY" --body "$body" || true
  else
    gh issue create --repo "$GITHUB_REPOSITORY" --title "[D5] Backup diario falló o dump vacío" --body "$body" || true
  fi
}

if [[ "$MODE" == "--meta" ]]; then
  key="${BACKUP_KEY:-}"
  size="${BACKUP_SIZE:-}"
  if [[ -z "$key" || ! "$size" =~ ^[0-9]+$ ]]; then
    fail "D5: no hay metadatos del dump de esta corrida (el job de Lightsail falló o no subió a S3)."
  fi
  echo "Dump S3: $key ($size bytes)"
  if [[ "$size" -lt "$MIN_BYTES" ]]; then
    fail "D5: dump vacío o demasiado chico ($key, $size bytes; mínimo $MIN_BYTES)."
  fi
  echo "D5: dump presente y no vacío."
  exit 0
fi

DIR="$MODE"
if [[ ! -d "$DIR" ]]; then
  fail "D5: no hay directorio de dump '$DIR' ni metadatos --meta."
fi

mapfile -t files < <(find "$DIR" -type f \( -name '*.sql.gz' -o -name '*.sql' -o -name '*.dump' \) 2>/dev/null | sort)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "Contenido de $DIR:" >&2
  find "$DIR" -type f | head >&2 || true
  fail "D5: directorio sin dump (.sql.gz / .sql / .dump)."
fi

for file in "${files[@]}"; do
  size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
  echo "Dump: $file ($size bytes)"
  if [[ "$size" -lt "$MIN_BYTES" ]]; then
    fail "D5: dump vacío o demasiado chico ($file, $size bytes; mínimo $MIN_BYTES)."
  fi
done

echo "D5: dump presente y no vacío."
