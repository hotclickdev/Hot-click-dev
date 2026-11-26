package com.hotclick.agente.pago;

/** Un pedido que vino de un enlace de compra del bot quedó pagado. Se publica dentro de la transacción del pago. */
public record PedidoBotPagadoEvent(Long pedidoId, Long enlaceId) { }
