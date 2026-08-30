-- V106: sucursales por empresa (Negocio Plus — multi-sucursal)
CREATE TABLE IF NOT EXISTS hot_click_sucursal_tb (
    id_sucursal    BIGSERIAL PRIMARY KEY,
    nombre         VARCHAR(120) NOT NULL,
    fk_id_empresa  BIGINT NOT NULL REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    fk_id_estado   INTEGER NOT NULL DEFAULT 1,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sucursal_empresa
    ON hot_click_sucursal_tb(fk_id_empresa);

CREATE INDEX IF NOT EXISTS idx_sucursal_empresa_estado
    ON hot_click_sucursal_tb(fk_id_empresa, fk_id_estado);
