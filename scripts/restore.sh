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
