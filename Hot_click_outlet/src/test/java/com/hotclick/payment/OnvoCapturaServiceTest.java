package com.hotclick.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoCapturaService.Captura;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ONVO | la captura solo escribe pagos ONVO pendientes y una sola vez")
class OnvoCapturaServiceTest {

    @Mock PagoRepository pagoRepository;
    @Mock WebhookEventRepository webhookEventRepository;
    @Mock PaymentService paymentService;
    @Mock PedidoGrupoService pedidoGrupoService;
    @Mock com.hotclick.service.payment.StockReservationService stockReservationService;
    @Mock com.hotclick.service.payment.AvisoReembolsoPendienteService avisoReembolso;
    @InjectMocks OnvoCapturaService captura;

    private Pago pago;

    @BeforeEach
    void armar() {
        pago = new Pago();
        pago.setMerchantToken("cs_1");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        when(pagoRepository.findByMerchantTokenForUpdate("cs_1")).thenReturn(Optional.of(pago));
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo(anyString(), anyString())).thenReturn(false);
    }

    @Test
    @DisplayName("Pago ONVO pendiente → se captura y se confirma el pedido")
    void capturaOnvoPendiente() {
        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isEqualTo(Captura.CAPTURADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        verify(paymentService).confirmarPedido(pago);
    }

    @Test
    @DisplayName("M-08: sin stock la confirmación devuelve SOBREVENTA → COBRADO_SOBREVENTA, evento procesado, sin excepción")
    void cobroSinStockQuedaRegistrado() {
        when(paymentService.confirmarPedido(pago))
            .thenReturn(com.hotclick.service.payment.PaymentOrderConfirmationService.Resultado.SOBREVENTA);
        org.mockito.ArgumentCaptor<com.hotclick.model.WebhookEvent> evento =
            org.mockito.ArgumentCaptor.forClass(com.hotclick.model.WebhookEvent.class);

        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isEqualTo(Captura.COBRADO_SOBREVENTA);

        verify(webhookEventRepository, org.mockito.Mockito.atLeastOnce()).save(evento.capture());
        assertThat(evento.getValue().getProcesado()).isTrue();
        assertThat(evento.getValue().getErrorProcesamiento()).contains("sin stock");
    }

    @Test
    @DisplayName("Pago de otro proveedor con el mismo token → no se toca")
    void otroProveedorNoSeCaptura() {
        pago.setProveedor("SINPE");
        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isEqualTo(Captura.DUPLICADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        verify(paymentService, never()).confirmarPedido(any());
    }

    @Test
    @DisplayName("Otra entrega ya lo capturó (carrera entre webhook y limpieza) → no se confirma dos veces")
    void duplicadoNoSeConfirmaDosVeces() {
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo("cs_1", OnvoPaymentProvider.EVENTO_SESION))
            .thenReturn(true);
        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isEqualTo(Captura.DUPLICADO);

        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo("cs_1", OnvoPaymentProvider.EVENTO_SESION))
            .thenReturn(false);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isEqualTo(Captura.DUPLICADO);
        verify(paymentService, never()).confirmarPedido(any());
    }

    @Test
    @DisplayName("Pedido ya cancelado (expiró o lo canceló el comprador): no se resucita; el pago queda para reembolso")
    void cobroSobrePedidoCanceladoNoResucita() {
        Pedido pedido = new Pedido();
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pago.setPedido(pedido);
        pago.setEstadoPago(Constants.PAGO_CANCELADO);
        when(pedidoGrupoService.delGrupo(pedido)).thenReturn(List.of(pedido));

        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isEqualTo(Captura.COBRADO_SOBRE_CANCELADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(paymentService, never()).confirmarPedido(any());
    }

    // ── fix2: intención explícita de cancelar ───────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("fix2: cobro que llega con la cancelación ya pedida (ONVO estaba en duda) → NO confirma: pedido CANCELADO, reserva liberada, REEMBOLSO_PENDIENTE")
    void cobroConCancelacionPedidaNoConfirma() {
        Pedido pedido = new Pedido();
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pago.setId(7L);
        pago.setPedido(pedido);
        when(pedidoGrupoService.delGrupo(pedido)).thenReturn(List.of(pedido));
        when(pagoRepository.cancelacionSolicitadaEnBase(7L))
            .thenReturn(Optional.of(java.time.LocalDateTime.now(Constants.ZONA_CR)));

        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isEqualTo(Captura.COBRADO_SOBRE_CANCELADO);

        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(stockReservationService).liberarReservas(pedido);
        verify(avisoReembolso).registrarPendiente(pago);
        verify(paymentService, never()).confirmarPedido(any());
    }

    @Test
    @DisplayName("fix2: sin cancelación pedida (expiración automática) el cobro válido confirma como siempre")
    void cobroSinCancelacionPedidaConfirma() {
        pago.setId(8L);
        when(pagoRepository.cancelacionSolicitadaEnBase(8L)).thenReturn(Optional.empty());
        assertThat(captura.capturarVerificado("cs_1", "{}", "cleanup")).isEqualTo(Captura.CAPTURADO);
        verify(paymentService).confirmarPedido(pago);
        verify(stockReservationService, never()).liberarReservas(any());
    }

    @Test
    @DisplayName("fix2: cobro sobre cancelación explícita (misma transacción, pago bloqueado) → evento registrado, pedido cancelado, REEMBOLSO_PENDIENTE; repetido → false")
    void registrarCobroSobreCancelacionExplicita() {
        Pedido pedido = new Pedido();
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pago.setId(9L);
        pago.setPedido(pedido);
        when(pedidoGrupoService.delGrupo(pedido)).thenReturn(List.of(pedido));

        assertThat(captura.registrarCobroSobreCancelacionExplicita(pago, "cancelacion")).isTrue();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(stockReservationService).liberarReservas(pedido);
        verify(avisoReembolso).registrarPendiente(pago);
        verify(paymentService, never()).confirmarPedido(any());

        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo("cs_1", OnvoPaymentProvider.EVENTO_SESION)).thenReturn(true);
        assertThat(captura.registrarCobroSobreCancelacionExplicita(pago, "cancelacion")).isFalse();
    }

    @Test
    @DisplayName("fix2: registrarCobroSobreCancelacionExplicita es MANDATORY (nunca abre REQUIRES_NEW) y guardarIntentId es REQUIRED")
    void propagaciones() throws Exception {
        var m1 = OnvoCapturaService.class.getMethod("registrarCobroSobreCancelacionExplicita", Pago.class, String.class);
        assertThat(m1.getAnnotation(org.springframework.transaction.annotation.Transactional.class).propagation())
            .isEqualTo(org.springframework.transaction.annotation.Propagation.MANDATORY);
        var m2 = OnvoCapturaService.class.getMethod("guardarIntentId", String.class, String.class);
        assertThat(m2.getAnnotation(org.springframework.transaction.annotation.Transactional.class).propagation())
            .isEqualTo(org.springframework.transaction.annotation.Propagation.REQUIRED);
    }

    @Test
    @DisplayName("fix2 BAJO: guardarIntentId usa el UPDATE condicional (no un save de la entidad)")
    void guardarIntentIdCondicional() {
        when(pagoRepository.intentIdEnBase("cs_1")).thenReturn(Optional.empty());
        captura.guardarIntentId("cs_1", "pi_1");
        verify(pagoRepository).guardarIntentId("cs_1", "pi_1");
        verify(pagoRepository, never()).save(any());

        when(pagoRepository.intentIdEnBase("cs_1")).thenReturn(Optional.of("pi_1"));
        org.mockito.Mockito.clearInvocations(pagoRepository);
        captura.guardarIntentId("cs_1", "pi_1");
        verify(pagoRepository, never()).guardarIntentId(anyString(), anyString());
    }
}
