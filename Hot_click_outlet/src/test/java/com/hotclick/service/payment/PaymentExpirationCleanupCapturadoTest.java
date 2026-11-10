package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoCapturaService;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.EmpresaRepository;
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
import org.springframework.web.client.ResourceAccessException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * MEDIO (QA: charge succeeded en ONVO y el pedido quedó cancelado): la limpieza por expiración relee el payment
 * intent antes de cancelar. Provider real; ONVO y la captura simulados. Solo se cancela con el intent sin cobro.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PaymentExpirationCleanup — intent cobrado en ONVO nunca se cancela")
class PaymentExpirationCleanupCapturadoTest {

    private static final String SESION = "cs_limpieza_capturado_01";
    private static final String INTENT = "pi_limpieza_capturado_01";

    @Mock private EmpresaRepository empresaRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private StockReservationService stockReservationService;
    @Mock private ReservaAntiBotService reservaAntiBot;
    @Mock private ReservaSospechosaLiberador reservaSospechosaLiberador;
    @Mock private OnvoService onvo;
    @Mock private OnvoCapturaService captura;
    @Mock private WebhookEventRepository webhookEventRepository;

    @InjectMocks private PaymentExpirationCleanupService service;

    private Pedido pedido;
    private Pago pago;
    private OnvoPaymentProvider provider;

    @BeforeEach
    void setUp() {
        when(reservaAntiBot.ahora()).thenAnswer(i -> LocalDateTime.now(Constants.ZONA_CR));
        Empresa empresa = new Empresa();
        empresa.setId(1L);
        empresa.setEstadoEmpresa("ACTIVO");

        pedido = new Pedido();
        pedido.setId(10L);
        pedido.setNumeroPedido("ORD-CAPT");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);

        pago = new Pago();
        pago.setId(20L);
        pago.setPedido(pedido);
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setMerchantToken(SESION);
        pago.setMonto(10_000);
        pago.setMoneda("CRC");

        when(empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")).thenReturn(List.of(empresa));
        when(pagoRepository.findExpiradosPendientesByEmpresa(any(), eq(1L))).thenReturn(List.of(pago));
        when(pagoRepository.findByMerchantToken(SESION)).thenReturn(Optional.of(pago));
        // fix2: el intent guardado se lee de la base (columna updatable=false).
        when(pagoRepository.intentIdEnBase(SESION)).thenAnswer(inv -> Optional.ofNullable(pago.getOnvoPaymentIntentId()));
        when(pagoRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(pago));
        when(pagoRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo(anyString(), anyString())).thenReturn(false);
        ReflectionTestUtils.setField(service, "pagoExpiradoCancelador", new PagoExpiradoCancelador(pagoRepository,
            pedidoRepository, stockReservationService, new PedidoGrupoService(pedidoRepository, pagoRepository)));

        when(onvo.isPagosDisponibles()).thenReturn(true);
        when(onvo.modoEsperado()).thenReturn("test");
        provider = new OnvoPaymentProvider();
        ReflectionTestUtils.setField(provider, "onvoService", onvo);
        ReflectionTestUtils.setField(provider, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(provider, "webhookEventRepository", webhookEventRepository);
        ReflectionTestUtils.setField(provider, "onvoCapturaService", captura);
        ReflectionTestUtils.setField(service, "onvoPaymentProvider", provider);
    }

    /** Caso QA: la sesión ya figura expirada y sin pagar aunque el intent cobró. */
    private void sesionVencidaSinPagar() {
        doReturn(Map.of("id", SESION, "status", "expired", "paymentStatus", "unpaid",
            "paymentIntentId", INTENT, "mode", "test")).when(onvo).obtenerCheckoutSession(SESION);
    }

    private static Map<String, Object> intent(String status) {
        Map<String, Object> m = new HashMap<>(Map.of("id", INTENT, "status", status, "amount", 1_000_000,
            "currency", "CRC", "mode", "test"));
        if ("succeeded".equals(status)) m.put("receivedAmount", 1_000_000);
        return m;
    }

    private void noCambia() {
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        verify(stockReservationService, never()).liberarReservas(any());
    }

    private void cancelado() {
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(stockReservationService).liberarReservas(pedido);
    }

    @Test
    @DisplayName("Capturado (intent succeeded, sesión expired/unpaid) → se confirma por la captura idempotente, no se cancela")
    void capturado_confirma() {
        sesionVencidaSinPagar();
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        doAnswer(inv -> { pago.setEstadoPago(Constants.PAGO_CAPTURADO); pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
            return OnvoCapturaService.Captura.CAPTURADO; })
            .when(captura).capturarVerificado(eq(SESION), anyString(), eq("cleanup"));

        service.ejecutar();

        verify(captura, times(1)).capturarVerificado(eq(SESION), anyString(), eq("cleanup"));
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
        verify(stockReservationService, never()).liberarReservas(any());
        verify(onvo, never()).expirarCheckoutSession(any());
        verify(onvo, never()).expirarCheckoutSessionTipado(any());
    }

    @Test
    @DisplayName("Capturado sin stock → REEMBOLSO_PENDIENTE (lo deja la captura), nunca CANCELADO")
    void capturadoSinStock_reembolsoPendiente() {
        sesionVencidaSinPagar();
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        doAnswer(inv -> { pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
            pedido.setEstadoPedido(Constants.PEDIDO_REVISION_SOBREVENTA);
            return OnvoCapturaService.Captura.COBRADO_SOBREVENTA; })
            .when(captura).capturarVerificado(eq(SESION), anyString(), eq("cleanup"));

        service.ejecutar();

        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_REVISION_SOBREVENTA);
        verify(stockReservationService, never()).liberarReservas(any());
        assertThat(provider.revisarCobroAntesDeCancelar(SESION, "cleanup"))
            .isEqualTo(OnvoPaymentProvider.CobroIntent.REEMBOLSO_PENDIENTE);
    }

    @Test
    @DisplayName("No capturado (requires_payment_method) → se cancela como hoy")
    void noCapturado_cancela() {
        sesionVencidaSinPagar();
        doReturn(intent("requires_payment_method")).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        cancelado();
        verify(captura, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("Intent canceled sin monto recibido → se cancela")
    void intentCancelado_cancela() {
        sesionVencidaSinPagar();
        doReturn(intent("canceled")).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        cancelado();
    }

    @Test
    @DisplayName("ONVO error 5xx/red al leer el intent → sin cambios, ni expire")
    void onvoError_sinCambios() {
        sesionVencidaSinPagar();
        doReturn(intent("requires_payment_method"))
            .doThrow(new IllegalStateException("Servicio de pagos no disponible temporalmente"))
            .when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        noCambia();
        verify(captura, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("Timeout de ONVO en la relectura de la sesión → sin cambios")
    void timeout_sinCambios() {
        doReturn(Map.of("id", SESION, "status", "expired", "paymentStatus", "unpaid", "paymentIntentId", INTENT, "mode", "test"))
            .doThrow(new ResourceAccessException("Read timed out"))
            .when(onvo).obtenerCheckoutSession(SESION);
        doReturn(intent("requires_payment_method")).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        noCambia();
    }

    @Test
    @DisplayName("Respuestas ambiguas (vacío, otro id, sin modo, processing, canceled con monto recibido) → sin cambios")
    void ambiguo_sinCambios() {
        sesionVencidaSinPagar();
        List<Map<String, Object>> ambiguos = new java.util.ArrayList<>();
        Map<String, Object> otroId = intent("requires_payment_method"); otroId.put("id", "pi_otro_intent_9999");
        Map<String, Object> sinModo = intent("requires_payment_method"); sinModo.remove("mode");
        Map<String, Object> conMonto = intent("canceled"); conMonto.put("receivedAmount", 1_000_000);
        Map<String, Object> raro = intent("estado_nuevo");
        ambiguos.add(otroId); ambiguos.add(sinModo); ambiguos.add(conMonto); ambiguos.add(raro); ambiguos.add(intent("processing"));
        for (Map<String, Object> i : ambiguos) {
            doReturn(i).when(onvo).obtenerPaymentIntent(INTENT);
            assertThat(provider.revisarCobroAntesDeCancelar(SESION, "cleanup"))
                .as("intent %s", i).isEqualTo(OnvoPaymentProvider.CobroIntent.EN_DUDA);
        }
        doReturn(Map.of()).when(onvo).obtenerPaymentIntent(INTENT);
        assertThat(provider.revisarCobroAntesDeCancelar(SESION, "cleanup")).isEqualTo(OnvoPaymentProvider.CobroIntent.EN_DUDA);
        // Sesión paid sin intent: inconsistente → en duda.
        doReturn(Map.of("status", "expired", "paymentStatus", "paid", "mode", "test")).when(onvo).obtenerCheckoutSession(SESION);
        assertThat(provider.revisarCobroAntesDeCancelar(SESION, "cleanup")).isEqualTo(OnvoPaymentProvider.CobroIntent.EN_DUDA);

        sesionVencidaSinPagar();
        doReturn(conMonto).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        noCambia();
    }

    @Test
    @DisplayName("Intent succeeded con otro monto → alerta, ni confirma ni cancela")
    void montoDistinto_sinCambios() {
        sesionVencidaSinPagar();
        Map<String, Object> i = intent("succeeded"); i.put("amount", 999_900);
        doReturn(i).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        noCambia();
        verify(captura, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("El cobro entra mientras se expiraba (última lectura succeeded) → se confirma, no se cancela")
    void cobroDuranteExpire_noCancela() {
        sesionVencidaSinPagar();
        doReturn(intent("requires_payment_method")).doReturn(intent("requires_payment_method"))
            .doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        doAnswer(inv -> { pago.setEstadoPago(Constants.PAGO_CAPTURADO); return OnvoCapturaService.Captura.CAPTURADO; })
            .when(captura).capturarVerificado(eq(SESION), anyString(), eq("cleanup"));
        service.ejecutar();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        verify(stockReservationService, never()).liberarReservas(any());
    }

    @Test
    @DisplayName("Sin llave utilizable → sin cambios")
    void sinLlave_sinCambios() {
        when(onvo.isPagosDisponibles()).thenReturn(false);
        service.ejecutar();
        noCambia();
    }

    @Test
    @DisplayName("Pago sin ONVO (proveedor STRIPE) → comportamiento actual: se cancela sin consultar ONVO")
    void sinOnvo_comportamientoActual() {
        pago.setProveedor("STRIPE");
        service.ejecutar();
        cancelado();
        verify(onvo, never()).obtenerCheckoutSession(any());
        verify(onvo, never()).obtenerPaymentIntent(any());
    }

    // ── Sesión inexistente (404): NO demuestra que el intent no cobró ───────────────────────────────────────────

    /** ONVO ya no tiene la sesión (leer() da vacío en 404); el pago recuerda el intent (V237) o no. */
    private void sesion404(String intentGuardado) {
        doReturn(Map.of()).when(onvo).obtenerCheckoutSession(SESION);
        pago.setOnvoPaymentIntentId(intentGuardado);
    }

    @Test
    @DisplayName("404 + intent guardado succeeded → se confirma por la captura idempotente, no se cancela")
    void sesion404IntentCobrado_confirma() {
        sesion404(INTENT);
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        doAnswer(inv -> { pago.setEstadoPago(Constants.PAGO_CAPTURADO); return OnvoCapturaService.Captura.CAPTURADO; })
            .when(captura).capturarVerificado(eq(SESION), anyString(), eq("cleanup"));

        service.ejecutar();

        verify(captura, times(1)).capturarVerificado(eq(SESION), anyString(), eq("cleanup"));
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        verify(stockReservationService, never()).liberarReservas(any());
    }

    @Test
    @DisplayName("404 + intent guardado succeeded sin stock → REEMBOLSO_PENDIENTE, no se cancela")
    void sesion404IntentCobradoSinStock_reembolso() {
        sesion404(INTENT);
        doReturn(intent("succeeded")).when(onvo).obtenerPaymentIntent(INTENT);
        doAnswer(inv -> { pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
            return OnvoCapturaService.Captura.COBRADO_SOBREVENTA; })
            .when(captura).capturarVerificado(eq(SESION), anyString(), eq("cleanup"));
        service.ejecutar();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(stockReservationService, never()).liberarReservas(any());
    }

    @Test
    @DisplayName("404 + error / timeout / ambiguo al leer el intent guardado → sin cambios")
    void sesion404IntentErrorOAmbiguo_sinCambios() {
        sesion404(INTENT);
        doThrow(new IllegalStateException("5xx")).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        noCambia();

        doThrow(new ResourceAccessException("Read timed out")).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        noCambia();

        for (String estado : List.of("processing", "requires_action", "requires_capture", "estado_nuevo")) {
            doReturn(intent(estado)).when(onvo).obtenerPaymentIntent(INTENT);
            service.ejecutar();
            noCambia();
        }
        Map<String, Object> otroModo = intent("requires_payment_method"); otroModo.put("mode", "live");
        doReturn(otroModo).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        doReturn(Map.of()).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        noCambia();
        verify(captura, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("404 + intent guardado explícitamente no cobrado (requires_payment_method / canceled) → se cancela")
    void sesion404IntentNoCobrado_cancela() {
        sesion404(INTENT);
        doReturn(intent("requires_payment_method")).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        cancelado();
        verify(captura, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("404 sin intent resoluble → no cancela ni libera stock (alerta, revisión manual)")
    void sesion404SinIntent_noLibera() {
        sesion404(null);
        service.ejecutar();
        service.ejecutar();
        noCambia();
        verify(onvo, never()).obtenerPaymentIntent(any());
        assertThat(provider.revisarCobroAntesDeCancelar(SESION, "cleanup"))
            .isEqualTo(OnvoPaymentProvider.CobroIntent.EN_DUDA);
    }

    @Test
    @DisplayName("La sesión expone su intent → se recuerda en el pago (V237) para cuando ONVO dé 404")
    void sesionConIntent_seRecuerda() {
        sesionVencidaSinPagar();
        doReturn(intent("processing")).when(onvo).obtenerPaymentIntent(INTENT);
        service.ejecutar();
        verify(captura, org.mockito.Mockito.atLeastOnce()).guardarIntentId(SESION, INTENT);
        noCambia();
    }
}
