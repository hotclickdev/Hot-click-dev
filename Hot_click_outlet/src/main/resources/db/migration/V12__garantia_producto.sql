-- V12: Campo garantia_dias en producto
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS garantia_dias INTEGER DEFAULT 0;
