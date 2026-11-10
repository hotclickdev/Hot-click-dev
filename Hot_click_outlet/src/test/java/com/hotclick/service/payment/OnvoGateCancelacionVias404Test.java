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
        // fix2: el intent guardado se lee de la base (columna updatable=false), no de la copia en memoria.
        when(pagoRepository.intentIdEnBase(SESION)).thenAnswer(inv -> Optional.ofNullable(pago.getOnvoPaymentIntentId()));
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
    @DisplayName("Comprador: sesión 404 sin intent conocido → 409, no se marca FALLIDO; la intención de cancelar queda registrada")
    void cancelar404SinIntent_noCancela() {
        assertThatThrownBy(() -> cancelacion.cancelarAnon("ORD-G404", "ok"))
            .isInstanceOf(CancelacionPendienteOnvoException.class)
            .hasMessageContaining("Registramos tu pedido de cancelación");
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
        verify(pagoRepository).registrarCancelacionSolicitada(eq(41L), any(), eq("INVITADO"));
    }

    @Test
    @DisplayName("fix2 Comprador: sesión 404 + intent guardado succeeded → NO confirma: pedido cancelado y REEMBOLSO_PENDIENTE")
    void cancelar404IntentCobrado_reembolsoPendienteSinConfirmar() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        doAnswer(inv -> { pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE); return true; })
            .when(captura).registrarCobroSobreCancelacionExplicita(pago, "cancelacion");

        cancelacion.cancelarAnon("ORD-G404", "ok");

        verify(captura, never()).capturarVerificado(anyString(), anyString(), anyString());
        verify(captura).registrarCobroSobreCancelacionExplicita(pago, "cancelacion");
        verify(pagoRepository).findByIdForUpdate(41L);
        verify(pagoRepository).registrarCancelacionSolicitada(eq(41L), any(), eq("INVITADO"));
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
    }

    @Test
    @DisplayName("fix2 Comprador: intent succeeded pero el webhook ya confirmó la venta (pago CAPTURADO al bloquear) → 409 revisión admin")
    void cancelarCobradoYaConfirmado_409SinTocarNada() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        Pago capturado = new Pago();
        capturado.setId(41L);
        capturado.setEstadoPago(Constants.PAGO_CAPTURADO);
        when(pagoRepository.findByIdForUpdate(41L)).thenReturn(Optional.of(capturado));

        assertThatThrownBy(() -> cancelacion.cancelarAnon("ORD-G404", "ok"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage(PaymentUserCancellationService.MSG_VENTA_CONFIRMADA);
        verify(captura, never()).registrarCobroSobreCancelacionExplicita(any(), any());
        verify(captura, never()).capturarVerificado(anyString(), anyString(), anyString());
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("fix2 Comprador: otra entrega registró la sesión entre el GET y el lock → 409, sin doble efecto")
    void cancelarCobradoCarreraConWebhook_409() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        when(captura.registrarCobroSobreCancelacionExplicita(pago, "cancelacion")).thenReturn(false);

        assertThatThrownBy(() -> cancelacion.cancelarAnon("ORD-G404", "ok"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage(PaymentUserCancellationService.MSG_VENTA_CONFIRMADA);
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("Comprador: sesión 404 + intent guardado con error de ONVO → 409, sin cambios de estado")
    void cancelar404IntentError_noCancela() {
        pago.setOnvoPaymentIntentId(INTENT);
        doThrow(new IllegalStateException("5xx")).when(onvo).obtenerPaymentIntent(INTENT);
        assertThatThrownBy(() -> cancelacion.cancelarAnon("ORD-G404", "ok")).isInstanceOf(IllegalStateException.class);
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("Comprador: sesión 404 + intent guardado explícitamente no cobrado → se cancela como hoy (pago revalidado con lock)")
    void cancelar404IntentNoCobrado_cancela() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("canceled")).when(onvo).obtenerPaymentIntent(INTENT);
        cancelacion.cancelarAnon("ORD-G404", "ok");
        verify(pagoRepository).findByIdForUpdate(41L);
        verify(paymentFailureHandler).marcarFallido(pago, "Cancelado por el usuario");
    }

    @Test
    @DisplayName("Panel: sesión 404 sin intent conocido → 409 y la intención de cancelar queda registrada (PANEL)")
    void panel404SinIntent_noCancela() {
        assertThatThrownBy(() -> cancelacion.cerrarPagoOnvoAntesDeCancelar(pedido))
            .isInstanceOf(com.hotclick.exception.CancelacionSolicitadaRegistradaException.class);
        verify(pagoRepository).registrarCancelacionSolicitada(eq(41L), any(), eq("PANEL"));
    }

    @Test
    @DisplayName("fix2 Panel (provider real): intent succeeded → sin captura REQUIRES_NEW (sin autobloqueo); REEMBOLSO_PENDIENTE")
    void panelIntentCobrado_sinCapturaRequiresNew() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        doAnswer(inv -> { pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE); return true; })
            .when(captura).registrarCobroSobreCancelacionExplicita(pago, "cancelacion");

        cancelacion.cerrarPagoOnvoAntesDeCancelar(pedido);

        verify(captura, never()).capturarVerificado(anyString(), anyString(), anyString());
        verify(captura).registrarCobroSobreCancelacionExplicita(pago, "cancelacion");
        verify(pagoRepository).registrarCancelacionSolicitada(eq(41L), any(), eq("PANEL"));
    }

    @Test
    @DisplayName("fix2 Panel (provider real): expire dice OK pero la sesión sigue abierta con requires_payment_method → no cancela; intención registrada")
    void panelSesionAbierta_noCancela() {
        doReturn(Map.of("status", "open", "paymentStatus", "unpaid", "paymentIntentId", INTENT, "mode", "test"))
            .when(onvo).obtenerCheckoutSession(SESION);
        doReturn(intent("requires_payment_method")).when(onvo).obtenerPaymentIntent(INTENT);

        assertThatThrownBy(() -> cancelacion.cerrarPagoOnvoAntesDeCancelar(pedido))
            .isInstanceOf(com.hotclick.exception.CancelacionSolicitadaRegistradaException.class);
        verify(pagoRepository).registrarCancelacionSolicitada(eq(41L), any(), eq("PANEL"));
        verify(captura, never()).capturarVerificado(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("fix2 Panel: pago ya CAPTURADO → 409 MSG_PAGO_COBRADO sin llamar a ONVO (revisión admin, sin devolución automática)")
    void panelPagoCapturado_409() {
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        assertThatThrownBy(() -> cancelacion.cerrarPagoOnvoAntesDeCancelar(pedido))
            .isInstanceOf(com.hotclick.exception.CancelacionPagoNoCerradaException.class)
            .hasMessage(PaymentUserCancellationService.MSG_PAGO_COBRADO);
        verify(onvo, never()).expirarCheckoutSessionTipado(anyString());
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
        return l;
    }

    @Test
    @DisplayName("fix2 Anti-bot: pago ONVO con sesión ABIERTA y intent requires_payment_method → no se libera ni se llama a ONVO")
    void antibotSesionAbierta_noLibera() {
        doReturn(Map.of("status", "open", "paymentStatus", "unpaid", "paymentIntentId", INTENT, "mode", "test"))
            .when(onvo).obtenerCheckoutSession(SESION);
        doReturn(intent("requires_payment_method")).when(onvo).obtenerPaymentIntent(INTENT);
        StockReservationService stock = mock(StockReservationService.class);

        assertThat(liberador(stock).liberarVencidas(1L, LocalDateTime.now(Constants.ZONA_CR))).isZero();

        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        verify(stock, never()).liberarReservas(any());
        verify(onvo, never()).obtenerCheckoutSession(anyString());
        verify(onvo, never()).obtenerPaymentIntent(anyString());
    }

    @Test
    @DisplayName("fix2 Anti-bot: pago ONVO con sesión 404 e intent guardado no cobrado → tampoco se libera aquí (lo cierra el TTL)")
    void antibot404IntentNoCobrado_noLibera() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("requires_payment_method")).when(onvo).obtenerPaymentIntent(INTENT);
        StockReservationService stock = mock(StockReservationService.class);
        assertThat(liberador(stock).liberarVencidas(1L, LocalDateTime.now(Constants.ZONA_CR))).isZero();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        verify(stock, never()).liberarReservas(any());
    }

    @Test
    @DisplayName("Anti-bot: pagos que no son ONVO se liberan como siempre")
    void antibotNoOnvo_libera() {
        pago.setProveedor(Constants.PROVEEDOR_STRIPE);
        StockReservationService stock = mock(StockReservationService.class);
        assertThat(liberador(stock).liberarVencidas(1L, LocalDateTime.now(Constants.ZONA_CR))).isEqualTo(1);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        verify(stock).liberarReservas(pedido);
    }

    // ── Gate: sesión abierta y requires_confirmation (BAJO) ──────────────────────────────────────────────────────

    @Test
    @DisplayName("fix2 BAJO: requires_confirmation con la sesión abierta NO es SIN_COBRO; con la sesión expired sí; canceled siempre")
    void gateSesionAbiertaNoEsTerminal() {
        doReturn(Map.of("status", "open", "paymentStatus", "unpaid", "paymentIntentId", INTENT, "mode", "test"))
            .when(onvo).obtenerCheckoutSession(SESION);
        doReturn(intent("requires_confirmation")).when(onvo).obtenerPaymentIntent(INTENT);
        assertThat(provider.revisarCobroAntesDeCancelar(SESION, "x")).isEqualTo(CobroIntent.SIN_COBRO_SESION_ABIERTA);

        doReturn(intent("canceled")).when(onvo).obtenerPaymentIntent(INTENT);
        assertThat(provider.revisarCobro(SESION, "x", true))
            .isEqualTo(new OnvoPaymentProvider.RevisionCobro(CobroIntent.SIN_COBRO, "canceled"));

        doReturn(Map.of("status", "expired", "paymentStatus", "unpaid", "paymentIntentId", INTENT, "mode", "test"))
            .when(onvo).obtenerCheckoutSession(SESION);
        doReturn(intent("requires_confirmation")).when(onvo).obtenerPaymentIntent(INTENT);
        assertThat(provider.revisarCobroAntesDeCancelar(SESION, "x")).isEqualTo(CobroIntent.SIN_COBRO);
    }

    @Test
    @DisplayName("fix2: capturar=false con intent cobrado → COBRADO_SIN_CAPTURAR y NO llama a la captura")
    void gateSinCapturar() {
        pago.setOnvoPaymentIntentId(INTENT);
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        assertThat(provider.revisarCobro(SESION, "cancelacion", false).cobro()).isEqualTo(CobroIntent.COBRADO_SIN_CAPTURAR);
        verify(captura, never()).capturarVerificado(anyString(), anyString(), anyString());
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

    @Test
    @DisplayName("fix2: la intención registrada no se revierte: noRollbackFor en las cancelaciones y en el cambio de estado del panel")
    void noRollbackForIntencion() throws Exception {
        for (String m : List.of("cancelarPorUsuario", "cancelarAnon")) {
            var t = PaymentUserCancellationService.class.getMethod(m, String.class, String.class)
                .getAnnotation(org.springframework.transaction.annotation.Transactional.class);
            assertThat(t.noRollbackFor()).containsExactly(CancelacionPendienteOnvoException.class);
        }
        var c4 = com.hotclick.service.PedidoService.class.getMethod("cambiarEstado", Long.class, String.class, String.class, String.class)
            .getAnnotation(org.springframework.transaction.annotation.Transactional.class);
        var c3 = com.hotclick.service.PedidoService.class.getMethod("cambiarEstado", Long.class, String.class, String.class)
            .getAnnotation(org.springframework.transaction.annotation.Transactional.class);
        assertThat(c4.noRollbackFor()).containsExactly(com.hotclick.exception.CancelacionSolicitadaRegistradaException.class);
        assertThat(c3.noRollbackFor()).containsExactly(com.hotclick.exception.CancelacionSolicitadaRegistradaException.class);
    }
}
