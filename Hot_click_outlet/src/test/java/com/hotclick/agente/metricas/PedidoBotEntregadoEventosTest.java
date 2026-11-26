package com.hotclick.agente.metricas;

import com.hotclick.agente.pago.PedidoBotEventos;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/** AG-35: solo los pedidos que nacieron de un enlace del bot publican el evento de entrega. */
class PedidoBotEntregadoEventosTest {

    @Test
    void pedidoDelBotPublicaElEventoConSuEnlace() {
        ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
        Pedido p = new Pedido();
        p.setId(100L);
        p.setEnlaceCompraId(42L);

        PedidoBotEventos.publicarEntregado(p, publisher);

        verify(publisher).publishEvent(new PedidoBotEntregadoEvent(100L, 42L));
    }

    @Test
    void pedidoNormalNoPublicaNada() {
        ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
        Pedido p = new Pedido();
        p.setId(100L);

        PedidoBotEventos.publicarEntregado(p, publisher);
        PedidoBotEventos.publicarEntregado(null, publisher);
        PedidoBotEventos.publicarEntregado(p, null);

        verify(publisher, never()).publishEvent(any(Object.class));
    }
}
