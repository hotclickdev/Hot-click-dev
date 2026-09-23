#!/usr/bin/env bash
# S8 — Restore drill contra Postgres local / throwaway.
# NUNCA escribe a producción. No inventa credenciales.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/eng-gates/restore-drill-lib.sh"

uso() {
  echo "uso: $0 verify <archivo.sql.gz>" >&2
  echo "     $0 restore <archivo.sql.gz>   # requiere DRILL_ALLOW_RESTORE=1 y DATABASE_URL local" >&2
  echo "     $0 drill <archivo.sql.gz>     # verify + restore + tablas" >&2
  echo "     $0 refuse-prod                # selftest: URL de prod debe fallar" >&2
  exit 2
}

cmd="${1:-}"
file="${2:-}"

case "$cmd" in
  verify)
    [[ -n "$file" ]] || uso
    restore_drill_verify "$file"
    ;;
  restore)
    [[ -n "$file" ]] || uso
    restore_drill_restore "$file"
    ;;
  drill)
    [[ -n "$file" ]] || uso
    restore_drill_verify "$file"
    restore_drill_restore "$file"
    restore_drill_check_tables
    echo "S8 OK: restore drill contra destino throwaway"
    ;;
  refuse-prod)
    if restore_drill_is_local_url "${DATABASE_URL:-postgresql://x:y@db.supabase.co:5432/postgres}"; then
      echo "FAIL: una URL de supabase se aceptó como local" >&2
      exit 1
    fi
    echo "OK: URL de prod rechazada"
    ;;
  *)
    uso
    ;;
esac
