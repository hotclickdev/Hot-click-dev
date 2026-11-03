-- Se aplica entre V70 y V71, solo en el arranque de base vacía (ver V1__esquema_base_vacia.sql).
-- En prod hot_click_producto_tb tiene uk_producto_sku antes de V71 (V71 usa ON CONFLICT (sku); V131 lo elimina).
-- V14 lo había creado sobre la tabla legacy "HOT_CLICK_PRODUCTO_TB"; se mueve a la tabla del modelo.
ALTER TABLE "HOT_CLICK_PRODUCTO_TB" DROP CONSTRAINT IF EXISTS uk_producto_sku;
ALTER TABLE hot_click_producto_tb ADD CONSTRAINT uk_producto_sku UNIQUE (sku);
