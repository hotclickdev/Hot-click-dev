-- ============================================================
-- V29: Tabla de gastos / egresos operativos
-- ============================================================

CREATE TABLE IF NOT EXISTS hot_click_gasto_tb (
  id_gasto        BIGSERIAL    PRIMARY KEY,
  concepto        VARCHAR(200) NOT NULL,
  monto           INTEGER      NOT NULL,
  categoria       VARCHAR(50),
  fecha           DATE         NOT NULL DEFAULT CURRENT_DATE,
  fk_id_empresa   BIGINT       REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_usuario   BIGINT       REFERENCES hot_click_usuario_tb(id_usuario),
  comprobante_url VARCHAR(500),
  notas           TEXT
);

CREATE INDEX IF NOT EXISTS idx_gasto_empresa ON hot_click_gasto_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_gasto_fecha   ON hot_click_gasto_tb (fecha);
