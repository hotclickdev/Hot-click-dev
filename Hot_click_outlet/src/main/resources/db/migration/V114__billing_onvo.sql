-- V114: Billing SaaS con ONVO — columnas de suscripción + precios CRC

ALTER TABLE hot_click_suscripcion_tb
    ADD COLUMN IF NOT EXISTS onvo_customer_id     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS onvo_subscription_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS onvo_price_id        VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_suscripcion_onvo_sub
    ON hot_click_suscripcion_tb (onvo_subscription_id)
    WHERE onvo_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suscripcion_onvo_customer
    ON hot_click_suscripcion_tb (onvo_customer_id)
    WHERE onvo_customer_id IS NOT NULL;

-- Precios mensuales en colones (UI seller: PYME ₡9.900, Negocio Plus ₡24.900)
UPDATE hot_click_plan_tb
SET precio_mensual = 9900
WHERE nombre = 'PYME';

UPDATE hot_click_plan_tb
SET precio_mensual = 24900
WHERE nombre = 'NEGOCIO_PLUS';

UPDATE hot_click_plan_tb
SET precio_mensual = 0
WHERE nombre = 'EMPRENDEDOR';
