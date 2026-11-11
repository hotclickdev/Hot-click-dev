-- V237 (10-nov-2026): id del payment intent de ONVO asociado a la checkout session del pago, guardado la primera vez
-- que un GET de la sesión lo muestra. Permite verificar el cobro aunque ONVO ya no devuelva la sesión (404) antes de
-- cancelar o liberar stock (MEDIO limpieza). Aditiva: columna nullable, sin backfill, sin cambios a datos existentes.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS onvo_payment_intent_id VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_hot_click_pago_onvo_payment_intent_id ON hot_click_pago_tb (onvo_payment_intent_id);
