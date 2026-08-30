#!/usr/bin/env bash
# ============================================================
# HOTCLICK — Procedimiento de restore de base de datos
# ============================================================
#
# PREREQUISITOS
#   - psql instalado localmente
#   - Variable SUPABASE_BACKUP_URL con Session Pooler URL:
#     postgresql://[user].[project-ref]:[password]@aws-1-us-east-2.pooler.supabase.com:5432/postgres
#
# VERIFY (sin tocar producción)
#   ./scripts/restore.sh verify hotclick-backup-YYYYMMDD-HHMMSS.sql.gz
#   Comprueba gzip y que el dump menciona tablas críticas.
#
# PASO 1 — Descargar el backup
#   GitHub → Actions → [run del día] → Artifacts → db-backup-XXXXXX → descargar ZIP
#   unzip db-backup-XXXXXX.zip
#
# PASO 2 — Descomprimir
#   gunzip hotclick-backup-YYYYMMDD-HHMMSS.sql.gz
#
# PASO 3 — Restaurar
#   export SUPABASE_BACKUP_URL="postgresql://..."
#   psql "$SUPABASE_BACKUP_URL" < hotclick-backup-YYYYMMDD-HHMMSS.sql
#
# PASO 4 — Verificar
#   psql "$SUPABASE_BACKUP_URL" -c "SELECT count(*) FROM hot_click_usuario_tb;"
#   psql "$SUPABASE_BACKUP_URL" -c "SELECT count(*) FROM hot_click_pedido_tb;"
#   psql "$SUPABASE_BACKUP_URL" -c "SELECT count(*) FROM hot_click_producto_tb;"
#
# RETENTION POLICY
#   Los artifacts se eliminan automáticamente después de 30 días.
#   Para extender la retención: editar retention-days en backup.yml (máx 400 días en free).
#
# NOTAS
#   - pg_dump usa Session Pooler (puerto 5432), NO el Transaction Pooler (6543).
#   - El backup incluye datos y schema; NO incluye roles de Supabase ni extensiones del sistema.
#   - En caso de emergencia contactar: hotclick.cr@gmail.com
set -euo pipefail

TABLAS_ESPERADAS=(
  hot_click_usuario_tb
  hot_click_pedido_tb
  hot_click_producto_tb
)

verificar_dump() {
  local archivo="$1"
  if [[ -z "$archivo" || ! -f "$archivo" ]]; then
    echo "uso: $0 verify archivo.sql.gz" >&2
    exit 1
  fi
  if [[ "$archivo" != *.gz ]]; then
    echo "se espera un .sql.gz" >&2
    exit 1
  fi
  gunzip -t "$archivo"
  local faltantes=()
  local contenido
  contenido="$(gzip -dc "$archivo")"
  local tabla
  for tabla in "${TABLAS_ESPERADAS[@]}"; do
    if ! grep -q "$tabla" <<<"$contenido"; then
      faltantes+=("$tabla")
    fi
  done
  if (( ${#faltantes[@]} > 0 )); then
    echo "faltan tablas en el dump: ${faltantes[*]}" >&2
    exit 1
  fi
  echo "OK: gzip integro y tablas esperadas presentes"
}

if [[ "${1:-}" == "verify" ]]; then
  verificar_dump "${2:-}"
  exit 0
fi
