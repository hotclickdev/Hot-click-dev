-- V129: empresa afectada en auditoría admin + índices para listado filtrado
-- Corregido: la tabla hot_click_auditoria_admin_tb NO existía en esta base
-- real (V58 solo activa RLS "si existe", nunca la crea) -- se crea acá con
-- el shape exacto del entity AuditoriaAdmin.java, idempotente.

CREATE TABLE IF NOT EXISTS hot_click_auditoria_admin_tb (
  id_auditoria  BIGSERIAL PRIMARY KEY,
  admin_id      BIGINT,
  admin_email   VARCHAR(150),
  accion        VARCHAR(50) NOT NULL,
  entidad       VARCHAR(50) NOT NULL,
  entidad_id    BIGINT,
  detalle       VARCHAR(500),
  fecha         TIMESTAMP NOT NULL
);

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
