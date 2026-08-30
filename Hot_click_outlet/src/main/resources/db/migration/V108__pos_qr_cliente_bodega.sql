-- V108: cliente y bodega de la venta QR (mismo dato que envía el POS en efectivo)
ALTER TABLE hot_click_pos_qr_sesion_tb
    ADD COLUMN IF NOT EXISTS fk_id_cliente BIGINT;

ALTER TABLE hot_click_pos_qr_sesion_tb
    ADD COLUMN IF NOT EXISTS fk_id_bodega BIGINT;
