-- V228 (04-nov-2026): Idempotency-Key del POST /v1/refunds persistida en el pago. Aditiva: columna nullable,
-- sin backfill. Va solo en el primer POST (registro): un REEMBOLSO_PENDIENTE sin id de refund NO se
-- reintenta; se revisa en ONVO y se resuelve a mano.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reembolso_idempotency_key VARCHAR(80);
-- Resolución manual (ADMIN) de un REEMBOLSO_PENDIENTE sin id de refund: quién, cuándo y qué resultado.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reembolso_resuelto_por VARCHAR(120);
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reembolso_resuelto_en TIMESTAMP;
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reembolso_resolucion VARCHAR(20);
