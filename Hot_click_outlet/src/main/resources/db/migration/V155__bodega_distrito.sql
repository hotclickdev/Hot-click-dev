-- Distrito oficial (IGN) de la bodega. Provincia y cantón ya existían.
ALTER TABLE hot_click_bodega_tb
    ADD COLUMN IF NOT EXISTS distrito VARCHAR(100);
