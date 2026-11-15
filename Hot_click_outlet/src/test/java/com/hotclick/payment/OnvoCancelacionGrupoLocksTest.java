package com.hotclick.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.service.suscripcion.LockTimeoutPorFila;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** fix2 (locks entre procesos): orden Pago → pedidos ORDER BY id → un solo lock de productos → escrituras. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ONVO | cancelarPedidosPendientes bloquea el grupo y libera en lote")
class OnvoCancelacionGrupoLocksTest {

    @Mock PagoRepository pagoRepository;
    @Mock WebhookEventRepository webhookEventRepository;
    @Mock PaymentService paymentService;
    @Mock PedidoGrupoService pedidoGrupoService;
    @Mock StockReservationService stockReservationService;
    @Mock LockTimeoutPorFila lockTimeout;
    @InjectMocks OnvoCapturaService captura;

    private Pago pago;
    private Pedido p1;
    private Pedido p2;
    private Pedido p3;

    private static Pedido pedido(long id, String estado, boolean reservado) {
        Pedido p = new Pedido();
        p.setId(id);
        p.setGrupoPago("grp-1");
        p.setEstadoPedido(estado);
        if (reservado) p.setStockReservadoEn(LocalDateTime.now(Constants.ZONA_CR));
        return p;
    }

    @BeforeEach
    void armar() {
        p1 = pedido(1, Constants.PEDIDO_PENDIENTE, true);
        p2 = pedido(2, Constants.PEDIDO_PENDIENTE_APROBACION, true);
        p3 = pedido(3, Constants.PEDIDO_PENDIENTE_COMPROBANTE, false);
        pago = new Pago();
        pago.setId(5L);
        pago.setMerchantToken("cs_1");
        pago.setPedido(p1);
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo(anyString(), anyString())).thenReturn(false);
        when(pedidoGrupoService.bloquearGrupo(p1)).thenReturn(List.of(p1, p2, p3));
    }

    @Test
    @DisplayName("orden: timeout → bloquearGrupo (pedidos por id) → UN lock de productos → CANCELADO; sin liberarReservas")
    void ordenDeLlamadas() {
        // Aserto de orden: al liberar, ningún pedido está cancelado todavía (las escrituras van después).
        org.mockito.Mockito.doAnswer(inv -> {
            assertThat(List.of(p1, p2, p3)).allMatch(p -> !Constants.PEDIDO_CANCELADO.equals(p.getEstadoPedido()));
            return null;
        }).when(stockReservationService).liberarReservasDeGrupoBloqueado(any());

        assertThat(captura.registrarCobroSobreCancelacionExplicita(pago, "cancelacion")).isTrue();

        InOrder o = inOrder(lockTimeout, pedidoGrupoService, stockReservationService);
        o.verify(lockTimeout).aplicar();
        o.verify(pedidoGrupoService).bloquearGrupo(p1);
        o.verify(stockReservationService).liberarReservasDeGrupoBloqueado(List.of(p1, p2));
        verify(stockReservationService, org.mockito.Mockito.times(1)).liberarReservasDeGrupoBloqueado(any());
        verify(stockReservationService, never()).liberarReservas(any());
        assertThat(List.of(p1, p2, p3)).allMatch(p -> Constants.PEDIDO_CANCELADO.equals(p.getEstadoPedido()));
    }

    @Test
    @DisplayName("filtra bajo lock: pedidos ya PAGADO/CANCELADO no se tocan; sin stockReservadoEn no se libera (idempotencia)")
    void filtraBajoLock() {
        p2.setEstadoPedido(Constants.PEDIDO_PAGADO);
        p3.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        p1.setStockReservadoEn(null);

        captura.registrarCobroSobreCancelacionExplicita(pago, "cancelacion");

        verify(stockReservationService).liberarReservasDeGrupoBloqueado(List.of());
        assertThat(p1.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(p2.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(p3.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
    }

    @Test
    @DisplayName("sin catch genérico: si la liberación falla se propaga y ningún pedido queda CANCELADO ni el pago en reembolso")
    void falloSePropaga() {
        doThrow(new IllegalStateException("boom")).when(stockReservationService).liberarReservasDeGrupoBloqueado(any());

        assertThatThrownBy(() -> captura.registrarCobroSobreCancelacionExplicita(pago, "cancelacion"))
            .isInstanceOf(IllegalStateException.class).hasMessage("boom");

        assertThat(List.of(p1, p2, p3)).noneMatch(p -> Constants.PEDIDO_CANCELADO.equals(p.getEstadoPedido()));
        assertThat(pago.getEstadoPago()).isNotEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(pagoRepository, never()).save(any());
    }

    @Test
    @DisplayName("un lock_timeout/deadlock al bloquear el grupo se propaga (sin reintentos locales): una sola llamada")
    void sinReintentosLocales() {
        when(pedidoGrupoService.bloquearGrupo(p1))
            .thenThrow(new org.springframework.dao.CannotAcquireLockException("lock timeout"));

        assertThatThrownBy(() -> captura.registrarCobroSobreCancelacionExplicita(pago, "cancelacion"))
            .isInstanceOf(org.springframework.dao.CannotAcquireLockException.class);

        verify(pedidoGrupoService, org.mockito.Mockito.times(1)).bloquearGrupo(p1);
        verify(stockReservationService, never()).liberarReservasDeGrupoBloqueado(any());
    }
}
