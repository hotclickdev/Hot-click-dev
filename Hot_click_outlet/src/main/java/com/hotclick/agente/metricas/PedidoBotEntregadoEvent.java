package com.hotclick.agente.metricas;

/** Un pedido que vino de un enlace de compra del bot pasó a ENTREGADO. Se publica dentro de la transacción del cambio. */
public record PedidoBotEntregadoEvent(Long pedidoId, Long enlaceId) { }
