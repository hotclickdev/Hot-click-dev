-- V230 (04-nov-2026) ALTO-01 (transición): V229 marcaba por origen ONLINE, pero ese origen no separa los manuales.
-- Pedido.origen vale ONLINE por defecto: /pedidos/manual no forzaba MANUAL antes de 3060b2a11 (03-nov-2026), y
-- POST /pedidos y VentaService tampoco lo fijan. Ninguno de esos caminos reservó. Se marca solo por el camino que
-- reservó:
--   * checkout con tarjeta o SINPE (CheckoutGrupoFactory): grupo_pago siempre presente;
--   * tienda pública invitado (StorefrontGuestOrderService): sin grupo_pago, envío DOMICILIO/RETIRO (valores del DTO
--     de la tienda; el panel usa ENVIO_A_DOMICILIO/RETIRO_EN_TIENDA), cliente_nombre obligatorio (el pedido manual nunca
--     lo pone) y sin Pago (mismo criterio que ReservaTiendaVencidaService).
-- Aditiva: no cambia el esquema, solo la marca nullable de V229 (V229 queda intacta por si ya corrió en algún ambiente).
UPDATE hot_click_pedido_tb
   SET stock_reservado_en = NULL
 WHERE stock_reservado_en IS NOT NULL
   AND NOT COALESCE((
        estado_pedido IN ('PENDIENTE', 'PENDIENTE_COMPROBANTE', 'PENDIENTE_APROBACION')
    AND stock_descontado_en IS NULL
    AND COALESCE(origen, 'ONLINE') = 'ONLINE'
    AND (grupo_pago IS NOT NULL
         OR (UPPER(metodo_envio) IN ('DOMICILIO', 'RETIRO')
             AND cliente_nombre IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM hot_click_pago_tb g WHERE g.fk_id_pedido = hot_click_pedido_tb.id_pedido)))
   ), FALSE);

UPDATE hot_click_pedido_tb
   SET stock_reservado_en = COALESCE(fecha_pedido, NOW())
 WHERE stock_reservado_en IS NULL
   AND estado_pedido IN ('PENDIENTE', 'PENDIENTE_COMPROBANTE', 'PENDIENTE_APROBACION')
   AND stock_descontado_en IS NULL
   AND COALESCE(origen, 'ONLINE') = 'ONLINE'
   AND (grupo_pago IS NOT NULL
        OR (UPPER(metodo_envio) IN ('DOMICILIO', 'RETIRO')
            AND cliente_nombre IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM hot_click_pago_tb g WHERE g.fk_id_pedido = hot_click_pedido_tb.id_pedido)));
