-- Estado propio para cobros QR sin stock: REEMBOLSO_PENDIENTE no cuenta como venta. Solo amplía los valores
-- permitidos del CHECK (todas las filas existentes siguen siendo válidas); no borra ni cambia datos.
ALTER TABLE hot_click_pos_qr_sesion_tb DROP CONSTRAINT IF EXISTS chk_pos_qr_estado;
ALTER TABLE hot_click_pos_qr_sesion_tb ADD CONSTRAINT chk_pos_qr_estado
    CHECK (estado IN ('PENDIENTE','PAGADO','EXPIRADO','CANCELADO','REEMBOLSO_PENDIENTE'));
