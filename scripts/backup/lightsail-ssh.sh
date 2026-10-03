#!/usr/bin/env bash
# Ejecuta un script en el host de Lightsail por SSH.
# El dump no viaja al runner: el script remoto corre allá y solo imprime un resumen.
# Secretos (nombres): LIGHTSAIL_SSH_HOST, LIGHTSAIL_SSH_USER,
# LIGHTSAIL_SSH_PRIVATE_KEY, LIGHTSAIL_SSH_KNOWN_HOSTS.
set -euo pipefail

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

require_secret() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    fail "falta el secret ${name}. No hay fallback a un socket local."
  fi
}

redact() {
  local text="$1"
  text="${text//${LIGHTSAIL_SSH_HOST}/[ssh-host]}"
  text="${text//${LIGHTSAIL_SSH_USER}/[ssh-user]}"
  printf '%s\n' "$text" | sed -E '/BEGIN .*PRIVATE KEY/,/END .*PRIVATE KEY/d'
}

run_remote() {
  local script="$1"
  local tmp key_file known_file raw rc
  umask 077
  tmp="$(mktemp -d)"
  key_file="${tmp}/id"
  known_file="${tmp}/known_hosts"
  printf '%s\n' "$LIGHTSAIL_SSH_PRIVATE_KEY" > "$key_file"
  printf '%s\n' "$LIGHTSAIL_SSH_KNOWN_HOSTS" > "$known_file"
  chmod 600 "$key_file" "$known_file"
  set +e
  raw="$(ssh \
    -i "$key_file" \
    -o UserKnownHostsFile="$known_file" \
    -o StrictHostKeyChecking=yes \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o ConnectTimeout=20 \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=40 \
    "${LIGHTSAIL_SSH_USER}@${LIGHTSAIL_SSH_HOST}" \
    bash -s < "$script" 2>&1)"
  rc=$?
  set -e
  rm -rf "$tmp"
  redact "$raw"
  return "$rc"
}

main() {
  local script="${1:-}"
  [[ -n "$script" && -f "$script" ]] || fail "uso: $0 <script-remoto>"
  require_secret LIGHTSAIL_SSH_HOST
  require_secret LIGHTSAIL_SSH_USER
  require_secret LIGHTSAIL_SSH_PRIVATE_KEY
  require_secret LIGHTSAIL_SSH_KNOWN_HOSTS
  run_remote "$script"
}

main "$@"
