package com.hotclick.service.retiro;

import java.util.List;

/** QR de retiro que acaba de pasar a VENCIDO. Solo ids de pedido: ningún dato personal viaja en el evento. */
public record RetiroVencidoEvent(List<Long> pedidoIds) {}
