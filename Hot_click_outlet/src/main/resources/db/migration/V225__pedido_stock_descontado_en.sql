-- V225 (03-nov-2026) P-07: un pedido MANUAL marcado ENTREGADO descuenta stock una sola vez.
-- Aditiva: columna nueva nullable. Marca cuándo el pedido ya consumió stock_actual (confirmación de pago
-- o entrega manual); si ya tiene valor, la entrega no vuelve a descontar.
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS stock_descontado_en TIMESTAMP;

-- Pedidos existentes ya pagados/entregados: se consideran descontados para no restar dos veces
-- al re-marcarlos (conservador: un pedido viejo nunca descuenta de nuevo).
UPDATE hot_click_pedido_tb
   SET stock_descontado_en = COALESCE(fecha_pedido, NOW())
 WHERE stock_descontado_en IS NULL
   AND estado_pedido NOT IN ('PENDIENTE', 'PENDIENTE_COMPROBANTE', 'PENDIENTE_APROBACION', 'CANCELADO');
