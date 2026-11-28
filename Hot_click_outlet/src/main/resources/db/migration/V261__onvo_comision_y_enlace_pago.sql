-- V261 (Fase 3 fiscal): comisión por negocio sincronizada a ONVO (marketplaceAppFee) y enlaces de pago único
-- para cobrar facturas tardías. Aditiva e idempotente: no borra ni reescribe datos.
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS fee_enviado_pct NUMERIC(5,2);
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS fee_enviado_en TIMESTAMP;
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS fee_pendiente BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS fee_intentos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS fee_ultimo_error VARCHAR(300);

CREATE TABLE IF NOT EXISTS hot_click_enlace_pago_onvo_tb (
    id_enlace_pago BIGSERIAL PRIMARY KEY,
    fk_id_empresa BIGINT NOT NULL,
    monto_crc INTEGER NOT NULL,
    motivo VARCHAR(200) NOT NULL,
    onvo_session_id VARCHAR(100) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    estado VARCHAR(15) NOT NULL DEFAULT 'CREADO',
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    pagado_en TIMESTAMP,
    cerrado_en TIMESTAMP,
    CONSTRAINT ck_enlace_pago_estado CHECK (estado IN ('CREADO', 'PAGADO', 'EXPIRADO', 'CANCELADO')),
    CONSTRAINT ck_enlace_pago_monto CHECK (monto_crc > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_enlace_pago_session ON hot_click_enlace_pago_onvo_tb (onvo_session_id);
CREATE INDEX IF NOT EXISTS ix_enlace_pago_empresa_estado ON hot_click_enlace_pago_onvo_tb (fk_id_empresa, estado);
