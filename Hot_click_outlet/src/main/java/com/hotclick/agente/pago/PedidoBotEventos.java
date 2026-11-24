package com.hotclick.agente.pago;

import com.hotclick.model.Pedido;
import org.springframework.context.ApplicationEventPublisher;

/**
 * Punto único para publicar los eventos del bot desde los flujos de pago existentes. Solo publica si el pedido
 * tiene enlace de compra: el pago de un pedido normal no dispara nada. No hace I/O ni cambia la lógica de cobro:
 * el listener actúa después del COMMIT.
 */
public final class PedidoBotEventos {

    private PedidoBotEventos() { }

    public static void publicarPagado(Pedido pedido, ApplicationEventPublisher publisher) {
        if (pedido == null || publisher == null || pedido.getEnlaceCompraId() == null) return;
        publisher.publishEvent(new PedidoBotPagadoEvent(pedido.getId(), pedido.getEnlaceCompraId()));
    }

    public static void publicarRechazado(Pedido pedido, ApplicationEventPublisher publisher) {
        if (pedido == null || publisher == null || pedido.getEnlaceCompraId() == null) return;
        publisher.publishEvent(new PedidoBotRechazadoEvent(pedido.getId(), pedido.getEnlaceCompraId()));
    }
}
