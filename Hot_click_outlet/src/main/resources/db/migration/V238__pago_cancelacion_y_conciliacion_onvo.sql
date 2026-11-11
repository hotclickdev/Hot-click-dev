-- V238 (10-nov-2026, fix2 pagos ONVO): intención explícita de cancelar y conciliación durable de pagos cerrados.
-- Aditiva: columnas nullable, sin DEFAULT, sin backfill y sin cambios a datos existentes.
--   cancelacion_solicitada_en / _origen: el comprador o el panel pidió cancelar (un cobro posterior va a
--     REEMBOLSO_PENDIENTE, nunca confirma la venta).
--   conciliacion_intentos / _proxima_en / _resuelta_en: backoff de la reconsulta de pagos ONVO FALLIDO/CANCELADO sin
--     corte por antigüedad; resuelta = intent canceled en ONVO. También agenda los PENDIENTE en duda.
--   conciliacion_sin_referencia_en: sesión 404 sin intent guardado; dedupe persistente de la alerta.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS cancelacion_solicitada_en TIMESTAMP;
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS cancelacion_solicitada_origen VARCHAR(20);
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS conciliacion_intentos INTEGER;
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS conciliacion_proxima_en TIMESTAMP;
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS conciliacion_resuelta_en TIMESTAMP;
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS conciliacion_sin_referencia_en TIMESTAMP;
-- Índice parcial para el reclamo de la conciliación (solo cerrados sin resolver).
CREATE INDEX IF NOT EXISTS idx_hot_click_pago_conciliacion_pendiente
    ON hot_click_pago_tb (conciliacion_proxima_en)
    WHERE conciliacion_resuelta_en IS NULL AND estado_pago IN ('FALLIDO', 'CANCELADO');
