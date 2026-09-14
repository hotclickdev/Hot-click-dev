#!/usr/bin/env bash
# Escaneo gitleaks acotado: no camina refs de otras ramas abiertas
# (p. ej. FPs de ola 4 en 35eb364). No relaja reglas de secretos reales.
set -euo pipefail

BIN="${GITLEAKS_BIN:-./gitleaks}"
CONFIG="${GITLEAKS_CONFIG:-.gitleaks.toml}"
COMMON=(--config "$CONFIG" --redact --exit-code 1 --verbose --no-banner)

if [[ ! -x "$BIN" ]]; then
  echo "gitleaks bin no ejecutable: $BIN" >&2
  exit 2
fi

scan_pr_range() {
  local base="$1" head="$2"
  echo "gitleaks git: rango PR ${base:0:7}..${head:0:7} (sin --all / sin otras ramas)"
  "$BIN" git "${COMMON[@]}" --log-opts="${base}..${head}" .
  echo "gitleaks dir: árbol HEAD (working tree)"
  "$BIN" dir "${COMMON[@]}" .
}

scan_branch() {
  echo "gitleaks git: historial de HEAD (sin --all)"
  "$BIN" git "${COMMON[@]}" .
  echo "gitleaks dir: árbol HEAD"
  "$BIN" dir "${COMMON[@]}" .
}

event="${GITHUB_EVENT_NAME:-}"
base="${BASE_SHA:-${GITHUB_BASE_SHA:-}}"
head="${HEAD_SHA:-${GITHUB_HEAD_SHA:-}}"

if [[ "$event" == "pull_request" && -n "$base" && -n "$head" ]]; then
  scan_pr_range "$base" "$head"
else
  scan_branch
fi
