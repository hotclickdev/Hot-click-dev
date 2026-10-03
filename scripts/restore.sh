#!/usr/bin/env bash
# Chequeo local de un dump -Fc. El restore de producción está en
# scripts/backup/RESTORE.md y se hace en el host, no desde esta máquina.
set -euo pipefail

MIN_DUMP_BYTES=1024

verificar_dump() {
  local archivo="$1"
  local size magic
  if [[ -z "$archivo" || ! -f "$archivo" ]]; then
    echo "uso: $0 verify archivo.dump" >&2
    exit 1
  fi
  size="$(stat -c%s "$archivo" 2>/dev/null || stat -f%z "$archivo")"
  if [[ "$size" -lt "$MIN_DUMP_BYTES" ]]; then
    echo "dump demasiado chico (${size} bytes)" >&2
    exit 1
  fi
  magic="$(head -c 5 "$archivo" || true)"
  if [[ "$magic" != "PGDMP" ]]; then
    echo "se espera un pg_dump custom (-Fc), magic PGDMP" >&2
    exit 1
  fi
  echo "OK: dump custom, ${size} bytes"
}

if [[ "${1:-}" == "verify" ]]; then
  verificar_dump "${2:-}"
  exit 0
fi

echo "Restore de producción: scripts/backup/RESTORE.md" >&2
echo "Este script solo verifica un archivo local: $0 verify archivo.dump" >&2
exit 2
