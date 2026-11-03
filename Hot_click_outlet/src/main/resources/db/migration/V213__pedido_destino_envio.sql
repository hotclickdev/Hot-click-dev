-- V213 (MED-5 Auditor 3): destino estructurado y zona cobrada en el pedido, para que el negocio vea
-- a qué provincia y cantón se cobró el envío. Aditiva: columnas nuevas nullables, sin tocar datos.
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS destino_provincia VARCHAR(40);
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS destino_canton VARCHAR(60);
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS envio_zona VARCHAR(12);
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS envio_monto_zona INTEGER;
