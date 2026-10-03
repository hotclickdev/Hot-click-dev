#!/usr/bin/env bash
# Corre EN el host Lightsail (vía SSH). No imprime credenciales ni filas.
# Lee AWS solo de HOTCLICK_BACKUP_ENV (default: $HOME/.config/hotclick/backup.env).
# pg_dump usa el socket local del contenedor hotclick-postgres (puerto no publicado).
set -euo pipefail

MIN_DUMP_BYTES=1024
CONTAINER=hotclick-postgres
ENV_FILE="${HOTCLICK_BACKUP_ENV:-${HOME}/.config/hotclick/backup.env}"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

load_env() {
  [[ -f "$ENV_FILE" ]] || fail "no existe el env de backup en el host (HOTCLICK_BACKUP_ENV)"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  [[ -n "${BACKUP_S3_BUCKET:-}" ]] || fail "BACKUP_S3_BUCKET vacío en el env del host"
  [[ -n "${AWS_ACCESS_KEY_ID:-}" ]] || fail "AWS_ACCESS_KEY_ID vacío en el env del host"
  [[ -n "${AWS_SECRET_ACCESS_KEY:-}" ]] || fail "AWS_SECRET_ACCESS_KEY vacío en el env del host"
  [[ -n "${AWS_DEFAULT_REGION:-}" ]] || fail "AWS_DEFAULT_REGION vacío en el env del host"
}

require_tools() {
  command -v docker >/dev/null 2>&1 || fail "docker no está en PATH"
  command -v aws >/dev/null 2>&1 || fail "aws cli no está en PATH"
  docker inspect "$CONTAINER" >/dev/null 2>&1 || fail "contenedor ${CONTAINER} no existe"
}

dump_database() {
  local dest="$1"
  docker exec "$CONTAINER" \
    sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' \
    > "$dest"
}

assert_dump() {
  local file="$1"
  local size magic
  size="$(stat -c%s "$file")"
  [[ "$size" -ge "$MIN_DUMP_BYTES" ]] || fail "dump demasiado chico (${size} bytes; mínimo ${MIN_DUMP_BYTES})"
  magic="$(head -c 5 "$file" || true)"
  [[ "$magic" == "PGDMP" ]] || fail "el archivo no es un pg_dump custom (-Fc)"
  printf '%s' "$size"
}

upload_dump() {
  local file="$1"
  local key="$2"
  aws s3 cp "$file" "s3://${BACKUP_S3_BUCKET}/${key}" \
    --sse AES256 \
    --only-show-errors
}

assert_remote() {
  local key="$1"
  local expect="$2"
  local size sse
  size="$(aws s3api head-object \
    --bucket "$BACKUP_S3_BUCKET" \
    --key "$key" \
    --query ContentLength \
    --output text)"
  sse="$(aws s3api head-object \
    --bucket "$BACKUP_S3_BUCKET" \
    --key "$key" \
    --query ServerSideEncryption \
    --output text)"
  if [[ "$size" != "$expect" || "$size" -lt "$MIN_DUMP_BYTES" ]]; then
    aws s3 rm "s3://${BACKUP_S3_BUCKET}/${key}" --only-show-errors || true
    fail "objeto S3 inválido (size=${size}, esperado=${expect})"
  fi
  if [[ "$sse" != "AES256" && "$sse" != "aws:kms" ]]; then
    aws s3 rm "s3://${BACKUP_S3_BUCKET}/${key}" --only-show-errors || true
    fail "objeto S3 sin cifrado del lado del servidor"
  fi
}

main() {
  local work dump stamp prefix key size
  load_env
  require_tools
  umask 077
  work="$(mktemp -d)"
  trap 'rm -rf "$work"' EXIT
  dump="${work}/hotclick.dump"
  dump_database "$dump"
  size="$(assert_dump "$dump")"
  stamp="$(date -u +%Y%m%d-%H%M%S)"
  prefix="${BACKUP_S3_PREFIX:-db}"
  prefix="${prefix#/}"
  prefix="${prefix%/}"
  key="${prefix}/hotclick-${stamp}.dump"
  upload_dump "$dump" "$key"
  assert_remote "$key" "$size"
  echo "BACKUP_KEY=${key}"
  echo "BACKUP_SIZE=${size}"
}

main "$@"
