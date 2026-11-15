package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** fix2: TTL y marcarFallido liberan el grupo con lock único ordenado, respetando sus filtros de estado. */
@DisplayName("TTL y marcarFallido | Pago → pedidos del grupo → un lock de productos")
class LiberacionGrupoTtlFalloTest {

    private PagoRepository pagoRepository;
    private PedidoRepository pedidoRepository;
    private StockReservationService stock;
    private PedidoGrupoService grupo;
    private Pedido pendiente;
    private Pedido comprobante;
    private Pedido aprobacion;
    private Pedido pagado;
    private Pago pago;

    private static Pedido pedido(long id, String estado, boolean reserva) {
        Pedido p = new Pedido();
        p.setId(id);
        p.setNumeroPedido("T-" + id);
        p.setEstadoPedido(estado);
        if (reserva) p.setStockReservadoEn(LocalDateTime.now());
        return p;
    }

    @BeforeEach
    void armar() {
        pagoRepository = mock(PagoRepository.class);
        pedidoRepository = mock(PedidoRepository.class);
        stock = mock(StockReservationService.class);
        grupo = mock(PedidoGrupoService.class);
        pendiente = pedido(1, Constants.PEDIDO_PENDIENTE, true);
        comprobante = pedido(2, Constants.PEDIDO_PENDIENTE_COMPROBANTE, true);
        aprobacion = pedido(3, Constants.PEDIDO_PENDIENTE_APROBACION, false);
        pagado = pedido(4, Constants.PEDIDO_PAGADO, false);
        pago = new Pago();
        pago.setId(9L);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(pendiente);
        when(pagoRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(pago));
        when(pagoRepository.marcarFallidoSiPendiente(any(), any())).thenReturn(1);
        when(grupo.bloquearGrupo(pendiente)).thenReturn(List.of(pendiente, comprobante, aprobacion, pagado));
    }

    @Test
    @DisplayName("TTL: solo cancela PEDIDO_PENDIENTE; orden pago → bloquearGrupo → lote → CANCELADO; sin liberarReservas")
    void ttlSoloPendiente() {
        PagoExpiradoCancelador ttl = new PagoExpiradoCancelador(pagoRepository, pedidoRepository, stock, grupo);
        org.mockito.Mockito.doAnswer(inv -> {
            assertThat(pendiente.getEstadoPedido()).as("escrituras después del lock").isEqualTo(Constants.PEDIDO_PENDIENTE);
            return null;
        }).when(stock).liberarReservasDeGrupoBloqueado(any());

        assertThat(ttl.cancelar(9L)).isTrue();

        InOrder o = inOrder(pagoRepository, grupo, stock);
        o.verify(pagoRepository).findByIdForUpdate(9L);
        o.verify(grupo).bloquearGrupo(pendiente);
        o.verify(stock).liberarReservasDeGrupoBloqueado(List.of(pendiente));
        verify(stock, never()).liberarReservas(any());
        assertThat(pendiente.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(comprobante.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertThat(aprobacion.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE_APROBACION);
        assertThat(pagado.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
    }

    @Test
    @DisplayName("TTL: sin catch genérico, el fallo del lote se propaga y ningún pedido se marca CANCELADO")
    void ttlFalloSePropaga() {
        PagoExpiradoCancelador ttl = new PagoExpiradoCancelador(pagoRepository, pedidoRepository, stock, grupo);
        doThrow(new IllegalStateException("boom")).when(stock).liberarReservasDeGrupoBloqueado(any());

        assertThatThrownBy(() -> ttl.cancelar(9L)).isInstanceOf(IllegalStateException.class).hasMessage("boom");

        assertThat(pendiente.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        verify(pedidoRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("marcarFallido: cancela PENDIENTE/COMPROBANTE/APROBACION, libera todo pedido con reserva en un lote y no toca PAGADO")
    void fallidoIncluyeLosTresPendientes() {
        PaymentFailureHandler h = new PaymentFailureHandler();
        ReflectionTestUtils.setField(h, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(h, "pedidoRepository", pedidoRepository);
        ReflectionTestUtils.setField(h, "stockReservationService", stock);
        ReflectionTestUtils.setField(h, "pedidoGrupoService", grupo);
        PaymentNotificationsFacade notif = mock(PaymentNotificationsFacade.class);
        ReflectionTestUtils.setField(h, "paymentNotificationsFacade", notif);

        h.marcarFallido(pago, "rechazado");

        InOrder o = inOrder(pagoRepository, grupo, stock);
        o.verify(pagoRepository).marcarFallidoSiPendiente(any(), any());
        o.verify(grupo).bloquearGrupo(pendiente);
        o.verify(stock).liberarReservasDeGrupoBloqueado(List.of(pendiente, comprobante));
        verify(stock, never()).liberarReservas(any());
        assertThat(pendiente.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(comprobante.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(aprobacion.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(pagado.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
        verify(notif, times(4)).onPagoFallido(any(), any());
    }

    @Test
    @DisplayName("marcarFallido: segundo aviso (UPDATE condicional = 0) no bloquea ni libera nada")
    void fallidoRepetidoNoLibera() {
        when(pagoRepository.marcarFallidoSiPendiente(any(), any())).thenReturn(0);
        PaymentFailureHandler h = new PaymentFailureHandler();
        ReflectionTestUtils.setField(h, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(h, "pedidoGrupoService", grupo);
        ReflectionTestUtils.setField(h, "stockReservationService", stock);

        h.marcarFallido(pago, "rechazado");

        verify(grupo, never()).bloquearGrupo(any());
        verify(stock, never()).liberarReservasDeGrupoBloqueado(any());
    }
}
