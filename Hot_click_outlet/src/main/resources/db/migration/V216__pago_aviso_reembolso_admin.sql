-- V216 (31-oct-2026): dedupe del aviso al admin por cobro de ONVO sobre grupo cancelado (REEMBOLSO_PENDIENTE).
-- Aditiva: una columna NULL. NULL = aún sin avisar; el UPDATE condicional sobre NULL deja un solo correo por pago.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS aviso_reembolso_admin_en TIMESTAMP;
