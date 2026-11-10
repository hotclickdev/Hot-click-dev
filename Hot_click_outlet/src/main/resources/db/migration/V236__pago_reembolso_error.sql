-- V236: motivo enmascarado cuando ONVO rechaza POST /v1/refunds y el pago queda REEMBOLSO_PENDIENTE.
-- Aditiva: columna nullable, sin backfill y sin borrar datos. El admin la ve en la cola de cobros.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reembolso_error VARCHAR(300);
