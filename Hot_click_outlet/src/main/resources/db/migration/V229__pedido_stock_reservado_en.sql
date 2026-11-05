-- V229 (04-nov-2026) ALTO-01: cancelar un pedido que nunca reservó (p. ej. MANUAL PENDIENTE) liberaba reservas
-- de otros pedidos del mismo producto (sobreventa). Aditiva: columna nullable que marca que ESTE pedido tiene
-- unidades en stock_reservado. Solo se libera o consume la reserva si la marca está puesta, y se limpia al hacerlo
-- (idempotente).
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS stock_reservado_en TIMESTAMP;

-- Pedidos vivos que ya reservaron: los del checkout y la tienda pública (origen ONLINE) que siguen pendientes y no
-- consumieron stock. Los MANUAL y POS nunca reservaron por pedido y quedan sin marca.
UPDATE hot_click_pedido_tb
   SET stock_reservado_en = COALESCE(fecha_pedido, NOW())
 WHERE stock_reservado_en IS NULL
   AND stock_descontado_en IS NULL
   AND COALESCE(origen, 'ONLINE') = 'ONLINE'
   AND estado_pedido IN ('PENDIENTE', 'PENDIENTE_COMPROBANTE', 'PENDIENTE_APROBACION');
