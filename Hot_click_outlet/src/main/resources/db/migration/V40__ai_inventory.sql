-- F21: AI Smart Inventory — add only fields not yet in producto
-- stock_minimo, stock_maximo, tiempo_reorden_dias already exist
ALTER TABLE hot_click_producto_tb ADD COLUMN IF NOT EXISTS clasificacion_abc  VARCHAR(1);
ALTER TABLE hot_click_producto_tb ADD COLUMN IF NOT EXISTS demanda_diaria_avg NUMERIC(10,2) DEFAULT 0;
ALTER TABLE hot_click_producto_tb ADD COLUMN IF NOT EXISTS fecha_ultima_venta TIMESTAMP;
