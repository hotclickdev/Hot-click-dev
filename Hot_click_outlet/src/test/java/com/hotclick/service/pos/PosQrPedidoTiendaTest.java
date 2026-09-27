package com.hotclick.service.pos;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PosQrSesion;
import com.hotclick.model.TurnoCaja;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.StripeService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.service.payment.CompraCheckoutResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QR POS vinculado al pedido de la tienda")
class PosQrPedidoTiendaTest {

    private static final long EMPRESA_QR = 7L;
    private static final int TOTAL_QR = 15000;

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

        service.vincularPedidoTienda("tokencarrito01", compra(pedido(88L, EMPRESA_QR, TOTAL_QR)));

        assertThat(sesion.getPedidoId()).isEqualTo(88L);
        assertThat(sesion.getEstado()).isEqualTo("PENDIENTE");
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("No vincula un pedido de otro negocio")
    void noVinculaPedidoDeOtroNegocio() {
        PosQrSesion sesion = sesionPendiente();
        when(posQrRepo.findByToken("tokencarrito01")).thenReturn(Optional.of(sesion));

        service.vincularPedidoTienda("tokencarrito01", compra(pedido(88L, 99L, TOTAL_QR)));

        assertThat(sesion.getPedidoId()).isNull();
        verify(posQrRepo, never()).save(any());
    }

    @Test
    @DisplayName("No vincula un pedido barato al QR de un monto mayor")
    void noVinculaPedidoDeOtroMonto() {
        PosQrSesion sesion = sesionPendiente();
        when(posQrRepo.findByToken("tokencarrito01")).thenReturn(Optional.of(sesion));

        service.vincularPedidoTienda("tokencarrito01", compra(pedido(88L, EMPRESA_QR, 500)));

        assertThat(sesion.getPedidoId()).isNull();
    }

    @Test
    @DisplayName("No pisa un vínculo previo ni acepta compras de varios negocios")
    void noPisaVinculoNiAceptaVariosPaquetes() {
        PosQrSesion vinculada = sesionPendiente();
        vinculada.setPedidoId(50L);
        assertThat(PosQrVentaService.motivoRechazoVinculo(vinculada, compra(pedido(88L, EMPRESA_QR, TOTAL_QR))))
            .contains("ya vinculada");

        CompraCheckoutResult varios = new CompraCheckoutResult(null,
            List.of(pedido(88L, EMPRESA_QR, TOTAL_QR), pedido(89L, 8L, 1000)), List.of());
        assertThat(PosQrVentaService.motivoRechazoVinculo(sesionPendiente(), varios)).contains("varios negocios");
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
        when(posQrRepo.reclamarParaCompletar(sesion.getId())).thenReturn(1);
        when(posQrRepo.save(sesion)).thenReturn(sesion);

        service.marcarPagadoPorPedidoTienda(88L);

        assertThat(sesion.getEstado()).isEqualTo("PAGADO");
        verify(completionService, never()).completarVentaTarjeta(any());
        verify(turnoCajaService).actualizarTotales(5L, "TARJETA", TOTAL_QR);
    }

    @Test
    @DisplayName("Webhook con pedidoId de tienda no crea segundo pedido POS")
    void webhookConPedidoTiendaNoCreaPos() {
        PosQrSesion sesion = sesionPendiente();
        sesion.setPedidoId(88L);
        sesion.setStripeSessionId("onvo_cs_pos");
        when(posQrRepo.findByStripeSessionId("onvo_cs_pos")).thenReturn(Optional.of(sesion));
        when(posQrRepo.reclamarParaCompletar(sesion.getId())).thenReturn(1);
        when(posQrRepo.save(sesion)).thenReturn(sesion);

        assertThat(service.completarSiPagoPasarela("onvo_cs_pos")).isTrue();
        assertThat(sesion.getEstado()).isEqualTo("PAGADO");
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("Si otra transacción ya reclamó la sesión, el webhook no crea otra venta")
    void webhookSinReclamoNoCreaVenta() {
        PosQrSesion sesion = sesionPendiente();
        sesion.setStripeSessionId("onvo_cs_pos");
        when(posQrRepo.findByStripeSessionId("onvo_cs_pos")).thenReturn(Optional.of(sesion));
        when(posQrRepo.reclamarParaCompletar(sesion.getId())).thenReturn(0);

        assertThat(service.completarSiPagoPasarela("onvo_cs_pos")).isTrue();
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("Doble confirmación SINPE: la segunda se rechaza sin crear venta")
    void confirmarSinpeSinReclamoSeRechaza() {
        PosQrSesion sesion = sesionPendiente();
        when(posQrRepo.findByToken("tokencarrito01")).thenReturn(Optional.of(sesion));
        when(posQrRepo.reclamarParaCompletar(sesion.getId())).thenReturn(0);

        assertThatThrownBy(() -> service.confirmarSinpe("tokencarrito01", 1L, EMPRESA_QR, null))
            .isInstanceOf(IllegalStateException.class);
        verify(completionService, never()).completarVentaSinpe(any(), any(), any());
    }

    @Test
    @DisplayName("Cantidades fuera de 1..999 se rechazan")
    void cantidadFueraDeRango() {
        assertThatThrownBy(() -> PosQrSessionService.cantidadDe(Map.of("cantidad", -1)))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PosQrSessionService.cantidadDe(Map.of("cantidad", 0)))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PosQrSessionService.cantidadDe(Map.of("cantidad", 1000)))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(PosQrSessionService.cantidadDe(Map.of("cantidad", 3))).isEqualTo(3);
        assertThat(PosQrSessionService.cantidadDe(Map.of())).isEqualTo(1);
    }

    private static PosQrSesion sesionPendiente() {
        Empresa empresa = new Empresa();
        empresa.setId(EMPRESA_QR);
        PosQrSesion sesion = new PosQrSesion();
        sesion.setToken("tokencarrito01");
        sesion.setEmpresa(empresa);
        sesion.setEstado("PENDIENTE");
        sesion.setMetodoPago("TARJETA");
        sesion.setTotal(TOTAL_QR);
        return sesion;
    }

    private static Pedido pedido(long id, long empresaId, int subtotal) {
        Empresa empresa = new Empresa();
        empresa.setId(empresaId);
        Pedido pedido = new Pedido();
        pedido.setId(id);
        pedido.setEmpresa(empresa);
        pedido.setSubtotal(subtotal);
        return pedido;
    }

    private static CompraCheckoutResult compra(Pedido pedido) {
        return new CompraCheckoutResult(null, List.of(pedido), List.of());
    }
}
