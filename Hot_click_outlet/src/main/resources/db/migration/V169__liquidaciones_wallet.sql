-- Liquidaciones separadas (decisión HOT_CLICK 12-oct-2026): CONTRA_ENTREGA (día siguiente) y
-- TARJETA (quincenal o mensual), además de los retiros MANUAL. El destino es la cuenta de cobro
-- (hot_click_metodo_cobro_tb) SINPE o IBAN aprobada del negocio.

ALTER TABLE hot_click_payout_request_tb ADD COLUMN IF NOT EXISTS tipo_liquidacion VARCHAR(15) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE hot_click_payout_request_tb ADD COLUMN IF NOT EXISTS fk_id_metodo_cobro BIGINT REFERENCES hot_click_metodo_cobro_tb(id_metodo_cobro);
ALTER TABLE hot_click_payout_request_tb DROP CONSTRAINT IF EXISTS ck_payout_tipo_liquidacion;
ALTER TABLE hot_click_payout_request_tb ADD CONSTRAINT ck_payout_tipo_liquidacion
    CHECK (tipo_liquidacion IN ('MANUAL', 'TARJETA', 'CONTRA_ENTREGA'));

-- Qué liquidación cubrió cada movimiento del wallet (null = aún no liquidado).
ALTER TABLE hot_click_wallet_transaccion_tb ADD COLUMN IF NOT EXISTS fk_id_payout_liquidacion BIGINT;
CREATE INDEX IF NOT EXISTS ix_wallet_tx_sin_liquidar
    ON hot_click_wallet_transaccion_tb (fk_id_empresa) WHERE fk_id_payout_liquidacion IS NULL;
