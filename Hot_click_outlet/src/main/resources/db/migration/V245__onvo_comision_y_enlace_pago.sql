-- V245 (Fase 3 fiscal): comisión por negocio sincronizada a ONVO (marketplaceAppFee) y enlaces de pago único
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

-- Pedidos cobrados en ONVO a nombre de una cuenta conectada con su % ya sincronizado: ONVO retiene la comisión
-- de HotClick (marketplaceAppFee), así que HotClick no la vuelve a descontar ni acredita el neto al wallet.
CREATE TABLE IF NOT EXISTS hot_click_pedido_retencion_onvo_tb (
    id_retencion BIGSERIAL PRIMARY KEY,
    fk_id_pedido BIGINT NOT NULL,
    onvo_account_id VARCHAR(100) NOT NULL,
    onvo_session_id VARCHAR(100),
    estado VARCHAR(12) NOT NULL DEFAULT 'RETENIDA',
    fee_pct NUMERIC(5,2) NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pedido_retencion_onvo_pedido ON hot_click_pedido_retencion_onvo_tb (fk_id_pedido);
CREATE INDEX IF NOT EXISTS ix_pedido_retencion_onvo_sesion ON hot_click_pedido_retencion_onvo_tb (onvo_session_id);
-- Un solo enlace de pago abierto por negocio, también ante altas simultáneas.
CREATE UNIQUE INDEX IF NOT EXISTS uq_enlace_pago_abierto_empresa ON hot_click_enlace_pago_onvo_tb (fk_id_empresa) WHERE estado = 'CREADO';

-- Interruptores del cobro por ONVO, apagados hasta validarlos contra el sandbox de ONVO.
ALTER TABLE hot_click_config_fiscal_tb ADD COLUMN IF NOT EXISTS onvo_cobro_a_nombre_negocio BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hot_click_config_fiscal_tb ADD COLUMN IF NOT EXISTS onvo_enlaces_pago BOOLEAN NOT NULL DEFAULT FALSE;
