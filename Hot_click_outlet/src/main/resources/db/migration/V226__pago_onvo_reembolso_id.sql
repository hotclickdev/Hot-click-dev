-- V226 (04-nov-2026): id del refund de ONVO (POST /v1/refunds) del reembolso que pide el ADMIN.
-- Sirve para reconsultar un reembolso que ONVO dejó "pending" sin pedir otro. Aditiva: columna nullable, sin backfill.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS onvo_reembolso_id VARCHAR(64);
