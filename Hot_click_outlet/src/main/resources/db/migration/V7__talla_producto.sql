-- V7: Campo talla en producto (ropa = letra, zapatos = número)
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS talla VARCHAR(20);
