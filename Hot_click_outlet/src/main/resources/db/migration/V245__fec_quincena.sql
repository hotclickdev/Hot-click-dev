-- V245 (Fase 4B): Factura Electrónica de Compra (FEC, tipo 08) por quincena. Programada pero APAGADA:
-- solo corre con régimen TRADICIONAL y fec_habilitada = TRUE. Aditiva e idempotente, sin datos sembrados.
ALTER TABLE hot_click_config_fiscal_tb ADD COLUMN IF NOT EXISTS fec_habilitada BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hot_click_config_fiscal_tb ADD COLUMN IF NOT EXISTS fec_permitir_no_inscrito BOOLEAN NOT NULL DEFAULT FALSE;

-- Una FEC consolidada por negocio y quincena. Estados: GENERADA | ENVIADA | ACEPTADA | RECHAZADA.
CREATE TABLE IF NOT EXISTS hot_click_fec_tb (
    id_fec BIGSERIAL PRIMARY KEY,
    fk_id_empresa BIGINT NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    periodo_desde DATE NOT NULL,
    periodo_hasta DATE NOT NULL,
    monto_compra BIGINT NOT NULL,
    estado VARCHAR(12) NOT NULL DEFAULT 'GENERADA',
    clave_numerica VARCHAR(50) NOT NULL,
    numero_consecutivo VARCHAR(20) NOT NULL,
    xml TEXT,
    mensaje_hacienda VARCHAR(1000),
    ambiente VARCHAR(4),
    intentos_envio INTEGER NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_envio TIMESTAMP,
    fecha_respuesta TIMESTAMP,
    CONSTRAINT ck_fec_estado CHECK (estado IN ('GENERADA', 'ENVIADA', 'ACEPTADA', 'RECHAZADA')),
    CONSTRAINT ck_fec_periodo CHECK (periodo_hasta >= periodo_desde),
    CONSTRAINT ck_fec_monto CHECK (monto_compra > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fec_empresa_periodo ON hot_click_fec_tb (fk_id_empresa, periodo_desde, periodo_hasta);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fec_clave ON hot_click_fec_tb (clave_numerica);
CREATE INDEX IF NOT EXISTS idx_fec_estado ON hot_click_fec_tb (estado);
