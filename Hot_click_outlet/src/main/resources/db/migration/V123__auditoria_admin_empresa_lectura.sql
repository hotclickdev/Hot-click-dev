-- V123: empresa afectada en auditoría admin + índices para listado filtrado
-- La tabla hot_click_auditoria_admin_tb ya existe (baseline / RLS en V58).
-- Solo se agrega fk_id_empresa (nullable en filas históricas) e índices de consulta.

ALTER TABLE hot_click_auditoria_admin_tb
  ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);

CREATE INDEX IF NOT EXISTS idx_auditoria_admin_fecha
  ON hot_click_auditoria_admin_tb (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_admin_accion
  ON hot_click_auditoria_admin_tb (accion);

CREATE INDEX IF NOT EXISTS idx_auditoria_admin_email
  ON hot_click_auditoria_admin_tb (admin_email);

CREATE INDEX IF NOT EXISTS idx_auditoria_admin_empresa
  ON hot_click_auditoria_admin_tb (fk_id_empresa);
