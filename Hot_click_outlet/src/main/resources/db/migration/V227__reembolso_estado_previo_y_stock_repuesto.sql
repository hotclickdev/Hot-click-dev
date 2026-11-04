-- V227 (04-nov-2026): reembolso ONVO completo. Aditiva: columnas nullable, sin backfill.
-- Estados de pedido y pago antes de pasar a REEMBOLSO_PENDIENTE: restaurar() vuelve al estado real
-- también cuando el refund se resuelve en otra llamada (reconsulta o webhook refund.*).
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reembolso_estado_pedido_previo VARCHAR(30);
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reembolso_estado_pago_previo VARCHAR(30);
-- Marca de stock repuesto por el reembolso: la reposición corre una sola vez.
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS stock_repuesto_en TIMESTAMP;
