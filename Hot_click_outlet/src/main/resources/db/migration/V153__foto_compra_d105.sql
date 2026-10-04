-- V146: foto privada del comprobante de compra. La ruta no se devuelve al cliente.

ALTER TABLE hot_click_compra_d105_tb
    ADD COLUMN IF NOT EXISTS foto_path VARCHAR(500);
