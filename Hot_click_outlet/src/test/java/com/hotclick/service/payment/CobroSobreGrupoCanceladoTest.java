package com.hotclick.service.payment;

import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.CuponService;
import com.hotclick.service.EncargoService;
import com.hotclick.service.GiftCardService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.TilopayService;
import com.hotclick.service.pos.PosQrVentaService;
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
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * MEDIO de Seguridad sobre #459: Tilopay y Stripe dejan el pago CAPTURADO antes de llamar a confirmarPedido. Si el
 * grupo ya está CANCELADO (o se cancela entre la lectura y el UPDATE condicional, carrera de ONVO), el punto común
 * pasa el pago a REEMBOLSO_PENDIENTE y alerta (onSobreventa), sin revivir el pedido. Idempotente.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Cobro sobre grupo CANCELADO queda para reembolso en el punto común")
class CobroSobreGrupoCanceladoTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private CuponService cuponService;
    @Mock private GiftCardService giftCardService;
    @Mock private StockReservationService stockReservationService;
    @Mock private PaymentNotificationsFacade paymentNotificationsFacade;
    @Mock private PosQrVentaService posQrVentaService;
    @Mock private PedidoGrupoService pedidoGrupoService;
    @Mock private EncargoService encargoService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private WebhookEventRepository webhookEventRepository;
    @Mock private TilopayService tilopayService;
    @Mock private TilopayPaymentProviderAccess providerAccess;
    @Mock private PaymentService paymentService;

    @InjectMocks private PaymentOrderConfirmationService confirmacion;
    @InjectMocks private TilopayConfirmacionService tilopay;

    private Pedido pedido;
    private Pago pago;

    @BeforeEach
    void armar() {
        pedido = new Pedido();
        pedido.setId(1L);
        pedido.setNumeroPedido("ORD-CAN");
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pedido.setItems(new ArrayList<>());
        pago = new Pago();
        pago.setId(10L);
        pago.setPedido(pedido);
        pago.setMerchantToken("ORD-CAN");
        pago.setMonto(10000);
        when(pedidoGrupoService.delGrupo(pedido)).thenAnswer(inv -> List.of(pedido));
        // PaymentService real delega en el punto común; acá se cablea igual.
        when(paymentService.confirmarPedido(any())).thenAnswer(
            inv -> confirmacion.confirmarPedido(inv.getArgument(0), paymentService, eventPublisher));
    }

    @Test
    @DisplayName("Tilopay (servicio sin cambios) aprueba sobre grupo CANCELADO → REEMBOLSO_PENDIENTE + alerta")
    void tilopay_grupoCancelado_reembolsoPendiente() {
        pago.setProveedor(Constants.PROVEEDOR_TILOPAY);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        when(pedidoRepository.findByNumeroPedido("ORD-CAN")).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoIdForUpdate(1L)).thenReturn(Optional.of(pago));
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo(anyString(), anyString())).thenReturn(false);
        when(tilopayService.consultarTransaccion("ORD-CAN")).thenReturn(new TilopayService.ConsultaResultado(
            true, "1", "ok", "AUTH", BigDecimal.valueOf(10000), "CRC", "ORD-CAN", false));
        when(paymentService.buildStatusResponse(pago)).thenReturn(new PaymentStatusResponse());

        tilopay.confirmar("ORD-CAN", Map.of("code", "1"));

        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(paymentNotificationsFacade).onSobreventa(eq(pago), eq("ORD-CAN"));
        verify(paymentNotificationsFacade, never()).onPedidoConfirmado(any(), any());
        verify(stockReservationService, never()).confirmAndConsumeStock(any(), any(), any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("pago CAPTURADO (Stripe) sobre grupo CANCELADO: SOBREVENTA y es idempotente (una sola alerta)")
    void capturado_idempotente() {
        pago.setProveedor(Constants.PROVEEDOR_STRIPE);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);

        assertThat(confirmacion.confirmarPedido(pago, paymentService, eventPublisher))
            .isEqualTo(PaymentOrderConfirmationService.Resultado.SOBREVENTA);
        assertThat(confirmacion.confirmarPedido(pago, paymentService, eventPublisher))
            .isEqualTo(PaymentOrderConfirmationService.Resultado.SOBREVENTA);

        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(pagoRepository, times(1)).saveAndFlush(pago);
        verify(paymentNotificationsFacade, times(1)).onSobreventa(any(), any());
    }

    @Test
    @DisplayName("pago ya REEMBOLSADO sobre grupo CANCELADO: no se toca ni se alerta")
    void reembolsado_noSeToca() {
        pago.setEstadoPago(Constants.PAGO_REEMBOLSADO);
        confirmacion.confirmarPedido(pago, paymentService, eventPublisher);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
        verify(pagoRepository, never()).save(any());
        verify(pagoRepository, never()).saveAndFlush(any());
        verify(paymentNotificationsFacade, never()).onSobreventa(any(), any());
    }

    @Test
    @DisplayName("carrera ONVO: se lee PENDIENTE, se cancela antes del UPDATE → reembolso pendiente + alerta")
    void carreraOnvo_canceladoAntesDelUpdate() {
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        when(stockReservationService.productosSinStock(any())).thenReturn(List.of());
        // La BD ya tiene el pedido CANCELADO: el UPDATE condicional no gana.
        when(pedidoRepository.reclamarParaConfirmar(anyLong(), any())).thenReturn(0);
        when(pedidoRepository.estadosDe(List.of(1L))).thenReturn(List.of(Constants.PEDIDO_CANCELADO));

        PaymentOrderConfirmationService.Resultado r = confirmacion.confirmarPedido(pago, paymentService, eventPublisher);

        assertThat(r).isEqualTo(PaymentOrderConfirmationService.Resultado.SOBREVENTA);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(paymentNotificationsFacade).onSobreventa(eq(pago), eq("ORD-CAN"));
        verify(stockReservationService, never()).confirmAndConsumeStock(any(), any(), any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("UPDATE perdido porque otro proceso ya confirmó: no es cancelación, el pago no se toca")
    void updatePerdido_porOtraConfirmacion_noReembolsa() {
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        when(stockReservationService.productosSinStock(any())).thenReturn(List.of());
        when(pedidoRepository.reclamarParaConfirmar(anyLong(), any())).thenReturn(0);
        when(pedidoRepository.estadosDe(List.of(1L))).thenReturn(List.of(Constants.PEDIDO_PAGADO));

        confirmacion.confirmarPedido(pago, paymentService, eventPublisher);

        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        verify(paymentNotificationsFacade, never()).onSobreventa(any(), any());
    }
}
