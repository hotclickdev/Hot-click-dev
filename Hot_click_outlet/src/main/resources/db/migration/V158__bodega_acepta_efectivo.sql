-- El negocio decide si cobra contra entrega en efectivo desde esta bodega.
-- Por defecto no: el checkout solo ofrece Efectivo si todas las bodegas del carrito lo aceptan.
ALTER TABLE hot_click_bodega_tb
    ADD COLUMN IF NOT EXISTS acepta_efectivo BOOLEAN NOT NULL DEFAULT FALSE;
