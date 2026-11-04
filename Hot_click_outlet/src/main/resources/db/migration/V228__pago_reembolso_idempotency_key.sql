-- V228 (04-nov-2026): Idempotency-Key del POST /v1/refunds persistida en el pago. Aditiva: columna nullable,
-- sin backfill. Un REEMBOLSO_PENDIENTE sin id de refund se reintenta con la MISMA clave (ONVO no documenta
-- un listado de refunds por intent para buscar uno ya creado).
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reembolso_idempotency_key VARCHAR(80);
