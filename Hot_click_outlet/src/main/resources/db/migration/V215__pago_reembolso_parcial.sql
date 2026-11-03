-- V215 (PR #460, MEDIO 2): cobro parcial con un paquete cancelado en paralelo. El pago sigue CAPTURADO
-- (se despacha lo confirmado) y acá queda registrado el monto de los paquetes sin venta que se debe
-- devolver y el ya devuelto. Aditiva: columnas nuevas nullables, sin tocar datos.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS monto_reembolso_pendiente INTEGER;
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS monto_reembolsado INTEGER;
