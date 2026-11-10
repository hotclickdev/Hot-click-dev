package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoCapturaService;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.payment.OnvoPaymentProvider.CobroIntent;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.OnvoService;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * MEDIO limpieza (corrección 404): el mismo gate fail-closed del intent en las demás vías que cancelan o liberan un
 * pago ONVO en línea: cancelación del comprador/panel, liberación anti-bot y rechazo. Provider real, ONVO simulado.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Gate del intent en todas las vías de cancelación ONVO (incluida sesión 404)")
class OnvoGateCancelacionVias404Test {

    private static final String SESION = "cs_gate_vias_404_01";
    private static final String INTENT = "pi_gate_vias_404_01";

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private PaymentFailureHandler paymentFailureHandler;
    @Mock private GuestCancelTokenService guestCancelTokenService;
    @Mock private OnvoService onvo;
    @Mock private OnvoCapturaService captura;
    @Mock private WebhookEventRepository webhookEventRepository;
    @Mock private com.hotclick.service.sinpe.SinpeOnvoMarketplaceService sinpeOnvoMarketplaceService;

    @InjectMocks private PaymentUserCancellationService cancelacion;

    private OnvoPaymentProvider provider;
    private Pedido pedido;
    private Pago pago;

    @BeforeEach
    void setUp() {
        pedido = new Pedido();
        pedido.setId(31L);
        pedido.setNumeroPedido("ORD-G404");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pago = new Pago();
        pago.setId(41L);
        pago.setPedido(pedido);
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setMerchantToken(SESION);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setMonto(10_000);
        pago.setMoneda("CRC");
        pago.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        when(guestCancelTokenService.esValido("ORD-G404", "ok")).thenReturn(true);
        when(pedidoRepository.findByNumeroPedido("ORD-G404")).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoId(31L)).thenReturn(Optional.of(pago));
        when(pagoRepository.findByMerchantToken(SESION)).thenReturn(Optional.of(pago));
        when(pagoRepository.findById(41L)).thenReturn(Optional.of(pago));
        when(pagoRepository.findByIdForUpdate(41L)).thenReturn(Optional.of(pago));
        when(onvo.isPagosDisponibles()).thenReturn(true);
        when(onvo.isMockMode()).thenReturn(false);
        when(onvo.modoEsperado()).thenReturn("test");
        // Cancelar: ONVO responde 404 al expirar (la sesión ya no existe) y también al leerla.
        when(onvo.expirarCheckoutSessionTipado(SESION))
            .thenReturn(new OnvoService.ResultadoExpirar(OnvoService.TipoExpirar.NO_EXISTE, Map.of()));
        doReturn(Map.of()).when(onvo).obtenerCheckoutSession(SESION);

        provider = new OnvoPaymentProvider();
        ReflectionTestUtils.setField(provider, "onvoService", onvo);
        ReflectionTestUtils.setField(provider, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(provider, "webhookEventRepository", webhookEventRepository);
        ReflectionTestUtils.setField(provider, "onvoCapturaService", captura);
        ReflectionTestUtils.setField(cancelacion, "onvoPaymentProvider", provider);
        ReflectionTestUtils.setField(cancelacion, "onvoService", onvo);
    }

    private static Map<String, Object> intent(String status) {
        Map<String, Object> m = new java.util.HashMap<>(Map.of("id", INTENT, "status", status, "amount", 1_000_000,
            "currency", "CRC", "mode", "test"));
        if ("succeeded".equals(status)) m.put("receivedAmount", 1_000_000);
        return m;
    }

    // ── Cancelación del comprador / panel ────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Comprador: sesión 404 sin intent conocido → 409, no se marca FALLIDO ni se libera")
    void cancelar404SinIntent_noCancela() {
        assertThatThrownBy(() -> cancelacion.cancelarAnon("ORD-G404", "ok"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("No pudimos confirmar con ONVO");
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("Comprador: sesión 404 + intent guardado succeeded → se confirma, 409 «ya fue recibido», sin cancelar")
    void cancelar404IntentCobrado_confirmaYNoCancela() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        when(captura.capturarVerificado(eq(SESION), anyString(), eq("cancelacion"))).thenReturn(OnvoCapturaService.Captura.CAPTURADO);

        assertThatThrownBy(() -> cancelacion.cancelarAnon("ORD-G404", "ok"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ya fue recibido");
        verify(captura).capturarVerificado(eq(SESION), anyString(), eq("cancelacion"));
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("Comprador: sesión 404 + intent guardado con error de ONVO → 409, sin cambios")
    void cancelar404IntentError_noCancela() {
        pago.setOnvoPaymentIntentId(INTENT);
        doThrow(new IllegalStateException("5xx")).when(onvo).obtenerPaymentIntent(INTENT);
        assertThatThrownBy(() -> cancelacion.cancelarAnon("ORD-G404", "ok")).isInstanceOf(IllegalStateException.class);
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("Comprador: sesión 404 + intent guardado explícitamente no cobrado → se cancela como hoy")
    void cancelar404IntentNoCobrado_cancela() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("canceled")).when(onvo).obtenerPaymentIntent(INTENT);
        cancelacion.cancelarAnon("ORD-G404", "ok");
        verify(paymentFailureHandler).marcarFallido(pago, "Cancelado por el usuario");
    }

    @Test
    @DisplayName("Panel: sesión 404 sin intent conocido → CancelacionPagoNoCerradaException (409)")
    void panel404SinIntent_noCancela() {
        assertThatThrownBy(() -> cancelacion.cerrarPagoOnvoAntesDeCancelar(pedido))
            .isInstanceOf(com.hotclick.exception.CancelacionPagoNoCerradaException.class);
    }

    // ── Liberación anti-bot ──────────────────────────────────────────────────────────────────────────────────────

    private ReservaSospechosaLiberador liberador(StockReservationService stock) {
        ReservaSospechosaLiberador l = new ReservaSospechosaLiberador();
        ReservaAntiBotService antiBot = mock(ReservaAntiBotService.class);
        when(antiBot.getVentanaMinutos()).thenReturn(15);
        when(antiBot.getLiberarEnMinutos()).thenReturn(15);
        when(pagoRepository.findIdsReservaMarcadaVencidaByEmpresa(any(), any(), anyLong())).thenReturn(List.of(41L));
        ReflectionTestUtils.setField(l, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(l, "stockReservationService", stock);
        ReflectionTestUtils.setField(l, "pedidoGrupoService", new PedidoGrupoService(pedidoRepository, pagoRepository));
        ReflectionTestUtils.setField(l, "reservaAntiBot", antiBot);
        ReflectionTestUtils.setField(l, "onvoPaymentProvider", provider);
        return l;
    }

    @Test
    @DisplayName("Anti-bot: pago ONVO con sesión 404 sin intent → no se libera stock")
    void antibot404SinIntent_noLibera() {
        StockReservationService stock = mock(StockReservationService.class);
        int liberados = liberador(stock).liberarVencidas(1L, LocalDateTime.now(Constants.ZONA_CR));
        assertThat(liberados).isZero();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        verify(stock, never()).liberarReservas(any());
    }

    @Test
    @DisplayName("Anti-bot: sesión 404 + intent guardado succeeded → se confirma, no se libera")
    void antibot404IntentCobrado_noLibera() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        doAnswer(inv -> { pago.setEstadoPago(Constants.PAGO_CAPTURADO); return OnvoCapturaService.Captura.CAPTURADO; })
            .when(captura).capturarVerificado(eq(SESION), anyString(), eq("antibot"));
        StockReservationService stock = mock(StockReservationService.class);
        assertThat(liberador(stock).liberarVencidas(1L, LocalDateTime.now(Constants.ZONA_CR))).isZero();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        verify(stock, never()).liberarReservas(any());
    }

    @Test
    @DisplayName("Anti-bot: sesión 404 + intent guardado no cobrado → se libera como hoy")
    void antibot404IntentNoCobrado_libera() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("requires_payment_method")).when(onvo).obtenerPaymentIntent(INTENT);
        StockReservationService stock = mock(StockReservationService.class);
        assertThat(liberador(stock).liberarVencidas(1L, LocalDateTime.now(Constants.ZONA_CR))).isEqualTo(1);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        verify(stock).liberarReservas(pedido);
    }

    // ── Rechazo (respaldo y limpieza) ────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Rechazo: el comprador reintentó y pagó entre el GET y el cierre → no se marca FALLIDO")
    void rechazoConCobroPosterior_noCierra() {
        PagoExpiradoCancelador cancelador = mock(PagoExpiradoCancelador.class);
        OnvoPaymentProvider p = mock(OnvoPaymentProvider.class);
        doReturn(Map.of("paymentStatus", "unpaid", "paymentIntentId", INTENT, "mode", "test")).when(onvo).obtenerCheckoutSession(SESION);
        Map<String, Object> rechazado = intent("requires_payment_method");
        rechazado.put("lastPaymentError", Map.of("code", "card_declined"));
        doReturn(rechazado).when(onvo).obtenerPaymentIntent(INTENT);
        when(p.expirarSesionSinCobro(SESION)).thenReturn(true);
        when(p.revisarCobroAntesDeCancelar(SESION, "rechazo")).thenReturn(CobroIntent.CONFIRMADO);
        OnvoRechazoService rechazo = new OnvoRechazoService(onvo, p, cancelador);

        assertThat(rechazo.cerrarSiRechazado(41L, SESION)).isFalse();
        verify(cancelador, never()).marcarFallido(anyLong());
    }
}
