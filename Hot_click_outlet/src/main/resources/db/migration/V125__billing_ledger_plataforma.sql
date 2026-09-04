-- V125: Ledger de billing de plataforma (eventos por tenant).
-- Complementa suscripcion + factura_saas (V114/V115); no sustituye Onvo/Stripe.

CREATE TABLE IF NOT EXISTS hot_click_billing_ledger_tb (
    id_billing_ledger   BIGSERIAL    PRIMARY KEY,
    fk_id_empresa       BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_suscripcion   BIGINT       REFERENCES hot_click_suscripcion_tb(id_suscripcion),
    tipo                VARCHAR(40)  NOT NULL,
    proveedor           VARCHAR(20),
    referencia_externa  VARCHAR(120),
    monto_centavos      INTEGER,
    moneda              VARCHAR(3)   NOT NULL DEFAULT 'crc',
    detalle             VARCHAR(500),
    fecha_evento        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_ledger_empresa_fecha
    ON hot_click_billing_ledger_tb (fk_id_empresa, fecha_evento DESC);

CREATE INDEX IF NOT EXISTS idx_billing_ledger_tipo
    ON hot_click_billing_ledger_tb (tipo);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_ledger_ref_tipo
    ON hot_click_billing_ledger_tb (referencia_externa, tipo)
    WHERE referencia_externa IS NOT NULL;
