package com.hotclick.service.sinpe;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.WebhookEvent;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PaymentFailureHandler;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.Resultado.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** P-01: garantías del SINPE marketplace por ONVO. */
class SinpeOnvoMarketplaceServiceTest {

    PagoRepository pagoRepo = mock(PagoRepository.class);
    WebhookEventRepository eventos = mock(WebhookEventRepository.class);
    PedidoGrupoService grupo = mock(PedidoGrupoService.class);
    PaymentFailureHandler fallos = mock(PaymentFailureHandler.class);
    PaymentService paymentService = mock(PaymentService.class);
    OnvoService onvo = mock(OnvoService.class);
    com.hotclick.service.payment.AvisoReembolsoPendienteService aviso = mock(com.hotclick.service.payment.AvisoReembolsoPendienteService.class);
    SinpeOnvoMarketplaceService s = new SinpeOnvoMarketplaceService();
    Pago pago;
    Pedido pedido;

    static final String TIPO = "payment-intent.succeeded";

    @BeforeEach
    void armar() {
        ReflectionTestUtils.setField(s, "pagoRepository", pagoRepo);
        ReflectionTestUtils.setField(s, "webhookEventRepository", eventos);
        ReflectionTestUtils.setField(s, "pedidoGrupoService", grupo);
        ReflectionTestUtils.setField(s, "paymentFailureHandler", fallos);
        ReflectionTestUtils.setField(s, "paymentService", paymentService);
        ReflectionTestUtils.setField(s, "avisoReembolso", aviso);
        s.setOnvoServiceParaTest(onvo);
        s.setTimeoutMinutosParaTest("15");
        s.setClock(Clock.fixed(Instant.parse("2026-10-25T18:00:00Z"), Constants.ZONA_CR));
        when(onvo.isPagosDisponibles()).thenReturn(true);
        when(onvo.isMockMode()).thenReturn(false);
        when(onvo.modoEsperado()).thenReturn("live");
        when(onvo.sinpeDestino()).thenReturn("8888-0000");
        when(eventos.save(any())).thenAnswer(i -> i.getArgument(0));
        pedido = new Pedido();
        pedido.setNumeroPedido("HC-1");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        when(grupo.delGrupo(pedido)).thenReturn(List.of(pedido));
        pago = new Pago();
        pago.setId(7L);
        pago.setMonto(12500);
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setMerchantToken("ONVOPI:pi_1");
        pago.setPedido(pedido);
        when(pagoRepo.findByMerchantTokenForUpdate("ONVOPI:pi_1")).thenReturn(Optional.of(pago));
    }

    private void get(String status, long amount) {
        doReturn(Map.<String, Object>of("id", "pi_1", "status", status, "amount", amount, "currency", "CRC", "mode", "live")).when(onvo).obtenerPaymentIntent("pi_1");
    }

    @Test
    @DisplayName("succeeded + GET con monto exacto en céntimos: CAPTURADO y confirma pedido; resuelve por ONVOPI:<id>")
    void succeededConfirma() {
        get("succeeded", 1_250_000L);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(CONFIRMADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        verify(paymentService).confirmarPedido(pago);
        verify(pagoRepo).findByMerchantTokenForUpdate("ONVOPI:pi_1");
        verify(eventos, atLeastOnce()).save(argThat((WebhookEvent e) -> TIPO.equals(e.getEventoTipo())
            && "ONVOPI:pi_1".equals(e.getMerchantToken())));
    }

    @Test
    @DisplayName("P-04: llave de prueba (mode=test) marca es_prueba en todos los pedidos del grupo antes de confirmar")
    void llaveDePruebaMarcaGrupo() {
        Pedido otro = new Pedido();
        otro.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        when(grupo.delGrupo(pedido)).thenReturn(List.of(pedido, otro));
        when(onvo.modoEsperado()).thenReturn("test");
        doReturn(Map.<String, Object>of("id", "pi_1", "status", "succeeded", "amount", 1_250_000L, "currency", "CRC", "mode", "test")).when(onvo).obtenerPaymentIntent("pi_1");
        org.mockito.Mockito.doAnswer(i -> {
            assertThat(pedido.isEsPrueba()).isTrue();
            return null;
        }).when(paymentService).confirmarPedido(pago);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(CONFIRMADO);
        assertThat(pedido.isEsPrueba()).isTrue();
        assertThat(otro.isEsPrueba()).isTrue();
        verify(grupo, org.mockito.Mockito.times(1)).delGrupo(pedido);
    }

    @Test
    @DisplayName("P-04: llave live no marca es_prueba")
    void llaveLiveNoMarca() {
        get("succeeded", 1_250_000L);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(CONFIRMADO);
        assertThat(pedido.isEsPrueba()).isFalse();
    }

    @Test
    @DisplayName("Duplicado (tipo + data.id ya registrado): 2xx sin GET ni confirmar")
    void duplicado() {
        when(eventos.existsByMerchantTokenAndEventoTipo("ONVOPI:pi_1", TIPO)).thenReturn(true);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(DUPLICADO);
        verify(onvo, never()).obtenerPaymentIntent(any());
        verify(paymentService, never()).confirmarPedido(any());
    }

    @Test
    @DisplayName("deferred/processing en el GET = esperar: el pago sigue PENDIENTE")
    void deferredEspera() {
        for (String st : new String[]{"deferred", "processing"}) {
            get(st, 1_250_000L);
            assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(EN_ESPERA);
        }
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        verify(paymentService, never()).confirmarPedido(any());
    }

    @Test
    @DisplayName("Monto distinto (no exacto) o el body dice succeeded pero el GET no: no confirma")
    void montoDistinto() {
        get("succeeded", 1_249_900L);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(NO_VERIFICADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
    }

    @Test
    @DisplayName("GET caído: 5xx transitorio (NO_CONSULTABLE), nada cambia")
    void getCaido() {
        when(onvo.obtenerPaymentIntent("pi_1")).thenThrow(new RuntimeException("timeout"));
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(NO_CONSULTABLE);
    }

    @Test
    @DisplayName("Mock ONVO: fail-closed, nunca confirma")
    void mockNoConfirma() {
        when(onvo.isMockMode()).thenReturn(true);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(NO_CONSULTABLE);
        assertThat(s.destinoDisponible()).isEmpty();
    }

    @Test
    @DisplayName("succeeded después de vencido (FALLIDO): reembolso pendiente, no resucita el pedido")
    void succeededSobreFallido() {
        pago.setEstadoPago(Constants.PAGO_FALLIDO);
        get("succeeded", 1_250_000L);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(COBRADO_SOBRE_CANCELADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(paymentService, never()).confirmarPedido(any());
    }

    @Test
    @DisplayName("M-08: succeeded sin stock → COBRADO_SOBREVENTA, el evento queda registrado (sin excepción ni reintento)")
    void succeededSinStock() {
        get("succeeded", 1_250_000L);
        when(paymentService.confirmarPedido(pago)).thenReturn(
            com.hotclick.service.payment.PaymentOrderConfirmationService.Resultado.SOBREVENTA);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(
            com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.Resultado.COBRADO_SOBREVENTA);
        verify(eventos).save(any());
    }

    @Test
    @DisplayName("Ya CAPTURADO: un evento posterior no revierte")
    void capturadoNoRevierte() {
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(DUPLICADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
    }

    @Test
    @DisplayName("Plazo interno vencido: cancel + GET canceled libera; GET no canceled no libera; succeeded no cancela")
    void barrido() {
        get("processing", 1_250_000L);
        doReturn(Map.<String, Object>of("id", "pi_1", "status", "processing"), Map.<String, Object>of("id", "pi_1", "status", "processing")).when(onvo).obtenerPaymentIntent("pi_1");
        assertThat(s.cancelarVencido(pago)).isFalse();
        verify(onvo).cancelarPaymentIntent("pi_1");
        verify(fallos, never()).marcarFallido(any(), any());

        doReturn(Map.<String, Object>of("id", "pi_1", "status", "processing"), Map.<String, Object>of("id", "pi_1", "status", "canceled")).when(onvo).obtenerPaymentIntent("pi_1");
        assertThat(s.cancelarVencido(pago)).isTrue();
        verify(fallos).marcarFallido(eq(pago), any());

        reset(fallos);
        clearInvocations(onvo);
        doReturn(Map.<String, Object>of("id", "pi_1", "status", "succeeded")).when(onvo).obtenerPaymentIntent("pi_1");
        assertThat(s.cancelarVencido(pago)).isFalse();
        verify(onvo, never()).cancelarPaymentIntent(any());
        verify(fallos, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("iniciar: identificación con guiones mín. 12; monto exacto; ONVOPI y plazo interno guardados antes de confirmar")
    void iniciar() {
        assertThatThrownBy(() -> s.iniciar(pago, "112345678", 0, "80000000")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> s.iniciar(pago, "01-1234-5678", 0, "abc")).isInstanceOf(IllegalArgumentException.class);
        when(onvo.crearPaymentIntent(eq(12500), any(), any())).thenReturn(new OnvoService.OnvoPaymentIntent("pi_9"));
        when(onvo.crearMetodoPagoSinpePos("01-1234-5678", 0, "80000000", null)).thenReturn(new OnvoService.OnvoPaymentMethod("pm_1"));
        LocalDateTime plazo = s.iniciar(pago, "01-1234-5678", 0, "80000000");
        assertThat(pago.getMerchantToken()).isEqualTo("ONVOPI:pi_9");
        assertThat(pago.getPlazoInternoSinpe()).isEqualTo(plazo)
            .isEqualTo(LocalDateTime.of(2026, 10, 25, 12, 15));
        // SCALE1: el Pago gestionado se escribe por dirty checking dentro del checkout, sin save().
        verify(pagoRepo, never()).save(any());
        verify(onvo).confirmarPaymentIntent("pi_9", "pm_1");
    }

    @Test
    @DisplayName("SCALE1: webhook confirmado = 0 save() del Pago y 1 solo INSERT del evento ya cerrado")
    void scale1_sinSavesRedundantes() throws Exception {
        get("succeeded", 1_250_000L);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(CONFIRMADO);
        verify(pagoRepo, never()).save(any());
        verify(eventos, org.mockito.Mockito.times(1)).save(argThat((WebhookEvent e) -> Boolean.TRUE.equals(e.getProcesado())));
        var tx = SinpeOnvoMarketplaceService.class.getMethod("iniciar", com.hotclick.model.Pago.class, String.class, Integer.class, String.class)
            .getAnnotation(org.springframework.transaction.annotation.Transactional.class);
        assertThat(tx.propagation()).isEqualTo(org.springframework.transaction.annotation.Propagation.MANDATORY);
    }

    @Test
    @DisplayName("Fail-closed: sin plazo interno configurado no hay SINPE")
    void sinPlazo() {
        s.setTimeoutMinutosParaTest("");
        assertThat(s.destinoDisponible()).isEmpty();
        assertThatThrownBy(() -> s.iniciar(pago, "01-1234-5678", 0, "80000000")).isInstanceOf(IllegalStateException.class);
        verify(onvo, never()).crearPaymentIntent(anyInt(), any(), any());
    }

    @Test
    @DisplayName("Aviso al admin IT: SINPE vía ONVO sobre pedido cancelado registra el aviso (marca en la transacción) una vez")
    void sinpeSobreCanceladoRegistraAviso() {
        pago.setEstadoPago(Constants.PAGO_FALLIDO);
        get("succeeded", 1_250_000L);
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(COBRADO_SOBRE_CANCELADO);
        verify(aviso, times(1)).registrarPendiente(pago);
        // El reintento del webhook es DUPLICADO: no vuelve a registrar.
        assertThat(s.confirmarPorWebhook(TIPO, "pi_1")).isEqualTo(DUPLICADO);
        verify(aviso, times(1)).registrarPendiente(any());
    }

    @Test
    @DisplayName("Aviso al admin IT: un cobro SINPE confirmado no registra aviso de reembolso")
    void sinpeConfirmadoNoAvisa() {
        get("succeeded", 1_250_000L);
        when(paymentService.confirmarPedido(pago)).thenReturn(
            com.hotclick.service.payment.PaymentOrderConfirmationService.Resultado.CONFIRMADO);
        s.confirmarPorWebhook(TIPO, "pi_1");
        verify(aviso, never()).registrarPendiente(any());
    }
}
