#!/usr/bin/env bash
# Corre EN Lightsail. Confirma que el último objeto del prefijo existe,
# pesa lo suficiente y no está viejo. No descarga el dump.
set -euo pipefail

MIN_DUMP_BYTES=1024
MAX_AGE_SECONDS=129600
ENV_FILE="${HOTCLICK_BACKUP_ENV:-${HOME}/.config/hotclick/backup.env}"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

load_env() {
  [[ -f "$ENV_FILE" ]] || fail "no existe el env de backup en el host"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  [[ -n "${BACKUP_S3_BUCKET:-}" ]] || fail "BACKUP_S3_BUCKET vacío"
  [[ -n "${AWS_DEFAULT_REGION:-}" ]] || fail "AWS_DEFAULT_REGION vacío"
  command -v aws >/dev/null 2>&1 || fail "aws cli no está en PATH"
}

latest_object() {
  local prefix="$1"
  local count
  count="$(aws s3api list-objects-v2 \
    --bucket "$BACKUP_S3_BUCKET" \
    --prefix "${prefix}/" \
    --query 'length(Contents)' \
    --output text)"
  [[ "$count" =~ ^[0-9]+$ && "$count" -gt 0 ]] || fail "no hay objetos de backup en el prefijo"
  aws s3api list-objects-v2 \
    --bucket "$BACKUP_S3_BUCKET" \
    --prefix "${prefix}/" \
    --query 'sort_by(Contents,&LastModified)[-1].[Key,Size,LastModified]' \
    --output text
}

assert_fresh() {
  local line="$1"
  local key size stamp then now age
  [[ -n "$line" && "$line" != "None" && "$line" != "None	None	None" ]] \
    || fail "no hay objetos de backup en el prefijo"
  key="$(printf '%s' "$line" | awk '{print $1}')"
  size="$(printf '%s' "$line" | awk '{print $2}')"
  stamp="$(printf '%s' "$line" | awk '{print $3}')"
  [[ "$key" == *.dump ]] || fail "el último objeto no es un .dump"
  [[ "$size" =~ ^[0-9]+$ ]] || fail "tamaño ilegible"
  [[ "$size" -ge "$MIN_DUMP_BYTES" ]] || fail "último dump demasiado chico (${size} bytes)"
  then="$(date -u -d "$stamp" +%s)"
  now="$(date -u +%s)"
  age=$((now - then))
  [[ "$age" -le "$MAX_AGE_SECONDS" ]] || fail "último dump tiene ${age}s (máximo ${MAX_AGE_SECONDS}s)"
  echo "BACKUP_KEY=${key}"
  echo "BACKUP_SIZE=${size}"
  echo "BACKUP_AGE_SECONDS=${age}"
}

main() {
  local prefix line
  load_env
  prefix="${BACKUP_S3_PREFIX:-db}"
  prefix="${prefix#/}"
  prefix="${prefix%/}"
  line="$(latest_object "$prefix")"
  assert_fresh "$line"
}

main "$@"
