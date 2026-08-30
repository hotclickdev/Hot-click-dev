package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;
import com.hotclick.model.TurnoCaja;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.StripeService;
import com.hotclick.service.TurnoCajaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QR POS vinculado al pedido de la tienda")
class PosQrPedidoTiendaTest {

    @Mock PosQrSesionRepository posQrRepo;
    @Mock StripeService stripeService;
    @Mock OnvoService onvoService;
    @Mock PosQrSessionService sessionService;
    @Mock PosQrVentaCompletionService completionService;
    @Mock TurnoCajaService turnoCajaService;
    @InjectMocks PosQrVentaService service;

    @Test
    @DisplayName("Al vincular guarda pedidoId sin marcar PAGADO")
    void vincularGuardaPedidoSinPagar() {
        PosQrSesion sesion = sesionPendiente();
        when(posQrRepo.findByToken("tokencarrito01")).thenReturn(Optional.of(sesion));
        when(posQrRepo.save(sesion)).thenReturn(sesion);

        service.vincularPedidoTienda("tokencarrito01", 88L);

        assertThat(sesion.getPedidoId()).isEqualTo(88L);
        assertThat(sesion.getEstado()).isEqualTo("PENDIENTE");
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("Al confirmar pago de tienda marca PAGADO sin crear pedido POS")
    void marcarPagadoSinCrearPedidoPos() {
        PosQrSesion sesion = sesionPendiente();
        sesion.setPedidoId(88L);
        TurnoCaja turno = new TurnoCaja();
        turno.setId(5L);
        sesion.setTurno(turno);
        when(posQrRepo.findByPedidoId(88L)).thenReturn(Optional.of(sesion));
        when(posQrRepo.save(sesion)).thenReturn(sesion);

        service.marcarPagadoPorPedidoTienda(88L);

        assertThat(sesion.getEstado()).isEqualTo("PAGADO");
        verify(completionService, never()).completarVentaTarjeta(any());
        verify(turnoCajaService).actualizarTotales(5L, "TARJETA", 15000);
    }

    @Test
    @DisplayName("Webhook con pedidoId de tienda no crea segundo pedido POS")
    void webhookConPedidoTiendaNoCreaPos() {
        PosQrSesion sesion = sesionPendiente();
        sesion.setPedidoId(88L);
        sesion.setStripeSessionId("onvo_cs_pos");
        when(posQrRepo.findByStripeSessionId("onvo_cs_pos")).thenReturn(Optional.of(sesion));
        when(posQrRepo.save(sesion)).thenReturn(sesion);

        assertThat(service.completarSiPagoPasarela("onvo_cs_pos")).isTrue();
        assertThat(sesion.getEstado()).isEqualTo("PAGADO");
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    private static PosQrSesion sesionPendiente() {
        PosQrSesion sesion = new PosQrSesion();
        sesion.setToken("tokencarrito01");
        sesion.setEstado("PENDIENTE");
        sesion.setMetodoPago("TARJETA");
        sesion.setTotal(15000);
        return sesion;
    }
}
