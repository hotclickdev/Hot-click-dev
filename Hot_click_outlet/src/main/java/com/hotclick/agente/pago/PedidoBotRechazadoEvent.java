package com.hotclick.agente.pago;

/** El pago de un pedido que vino de un enlace de compra del bot fue rechazado. */
public record PedidoBotRechazadoEvent(Long pedidoId, Long enlaceId) { }
