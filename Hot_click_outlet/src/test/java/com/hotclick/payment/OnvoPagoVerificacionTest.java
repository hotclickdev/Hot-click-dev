package com.hotclick.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoPaymentProvider.Verificacion;
import com.hotclick.repository.PagoRepository;
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

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ONVO | el pedido solo se confirma si ONVO confirma el cobro por GET")
class OnvoPagoVerificacionTest {

    @Mock OnvoService onvoService;
    @Mock PagoRepository pagoRepository;
    @Mock WebhookEventRepository webhookEventRepository;
    @Mock OnvoCapturaService onvoCapturaService;
    @InjectMocks OnvoPaymentProvider provider;

    private Pago pago;

    @BeforeEach
    void armar() {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("HC-77");
        pago = new Pago();
        pago.setMerchantToken("cs_1");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setMonto(12_500);
        pago.setMoneda("CRC");
        pago.setPedido(pedido);
        when(pagoRepository.findByMerchantToken("cs_1")).thenReturn(Optional.of(pago));
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo(anyString(), anyString())).thenReturn(false);
        when(onvoCapturaService.capturarVerificado(anyString(), anyString(), anyString()))
            .thenReturn(OnvoCapturaService.Captura.CAPTURADO);
        when(onvoService.modoEsperado()).thenReturn("live");
        when(onvoService.isPagosDisponibles()).thenReturn(true);
    }

    private void onvoResponde(String paymentStatus, String intentStatus, Object centimos) {
        doReturn(Map.of("paymentStatus", paymentStatus, "status", "complete", "paymentIntentId", "pi_1", "mode", "live")).when(onvoService).obtenerCheckoutSession("cs_1");
        doReturn(Map.of("id", "pi_1", "status", intentStatus, "amount", centimos, "currency", "CRC", "mode", "live")).when(onvoService).obtenerPaymentIntent("pi_1");
    }

    @Test
    @DisplayName("Cobro confirmado por ONVO con el monto exacto → se captura")
    void confirmadoSeCaptura() {
        onvoResponde("paid", "succeeded", 1_250_000);
        assertThat(provider.procesarPagoVerificado("cs_1", "webhook")).isEqualTo(Verificacion.OK);
        verify(onvoCapturaService).capturarVerificado(eq("cs_1"), anyString(), eq("webhook"));
    }

    @Test
    @DisplayName("Webhook con secret válido pero ONVO dice unpaid → no se captura")
    void sinCobroNoSeCaptura() {
        onvoResponde("unpaid", "requires_payment_method", 1_250_000);
        assertThat(provider.procesarPagoVerificado("cs_1", "webhook")).isEqualTo(Verificacion.NO_PAGADO);
        verify(onvoCapturaService, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("ONVO cobró otro monto (o lo reporta en colones) → no se captura")
    void montoDistintoNoSeCaptura() {
        onvoResponde("paid", "succeeded", 12_500);
        assertThat(provider.procesarPagoVerificado("cs_1", "webhook")).isEqualTo(Verificacion.DATOS_DISTINTOS);
        verify(onvoCapturaService, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("N1: sin llave utilizable → NO_CONSULTABLE, sin consultar ni capturar (no es «ONVO no la tiene»)")
    void sinLlaveNoConsultable() {
        when(onvoService.isPagosDisponibles()).thenReturn(false);
        assertThat(provider.procesarPagoVerificado("cs_1", "cleanup")).isEqualTo(Verificacion.NO_CONSULTABLE);
        verify(onvoService, never()).obtenerCheckoutSession(any());
        verify(onvoCapturaService, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("M2: intent en processing → EN_PROCESO, no se captura")
    void enProcesoNoSeCaptura() {
        onvoResponde("unpaid", "processing", 1_250_000);
        assertThat(provider.procesarPagoVerificado("cs_1", "cleanup")).isEqualTo(Verificacion.EN_PROCESO);
        verify(onvoCapturaService, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("Pedido ya cancelado: la captura lo informa y no se da por OK")
    void cobroSobreCancelado() {
        onvoResponde("paid", "succeeded", 1_250_000);
        when(onvoCapturaService.capturarVerificado(anyString(), anyString(), anyString()))
            .thenReturn(OnvoCapturaService.Captura.COBRADO_SOBRE_CANCELADO);
        assertThat(provider.procesarPagoVerificado("cs_1", "webhook")).isEqualTo(Verificacion.COBRADO_SOBRE_CANCELADO);
    }

    @Test
    @DisplayName("Expirar antes de cancelar: solo true si ONVO la deja expirada y sin cobro, o no la tiene")
    void expirarSesionSinCobro() {
        doReturn(Map.of("status", "expired", "paymentStatus", "unpaid")).when(onvoService).expirarCheckoutSession("cs_1");
        assertThat(provider.expirarSesionSinCobro("cs_1")).isTrue();

        doReturn(Map.of("status", "complete", "paymentStatus", "paid")).when(onvoService).expirarCheckoutSession("cs_1");
        assertThat(provider.expirarSesionSinCobro("cs_1")).isFalse();

        doReturn(Map.of("status", "open", "paymentStatus", "unpaid")).when(onvoService).expirarCheckoutSession("cs_1");
        assertThat(provider.expirarSesionSinCobro("cs_1")).isFalse();

        doReturn(Map.of()).when(onvoService).expirarCheckoutSession("cs_1");
        assertThat(provider.expirarSesionSinCobro("cs_1")).isTrue();
    }

    @Test
    @DisplayName("ONVO no tiene la sesión (o no hay llave: lectura vacía) → no se captura")
    void sesionVaciaNoSeCaptura() {
        doReturn(Map.of()).when(onvoService).obtenerCheckoutSession("cs_1");
        assertThat(provider.procesarPagoVerificado("cs_1", "webhook")).isEqualTo(Verificacion.NO_ENCONTRADO);
        verify(onvoCapturaService, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("ONVO no responde (5xx/red) → la excepción sube y no se captura")
    void onvoCaidoNoSeCaptura() {
        when(onvoService.obtenerCheckoutSession("cs_1")).thenThrow(new IllegalStateException("caído"));
        assertThatThrownBy(() -> provider.procesarPagoVerificado("cs_1", "webhook"))
            .isInstanceOf(IllegalStateException.class);
        verify(onvoCapturaService, never()).capturarVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("Sesión ya procesada o pago ya capturado → duplicado, sin consultar ni capturar")
    void duplicado() {
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo("cs_1", OnvoPaymentProvider.EVENTO_SESION))
            .thenReturn(true);
        assertThat(provider.procesarPagoVerificado("cs_1", "webhook")).isEqualTo(Verificacion.DUPLICADO);

        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo("cs_1", OnvoPaymentProvider.EVENTO_SESION))
            .thenReturn(false);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        assertThat(provider.procesarPagoVerificado("cs_1", "webhook")).isEqualTo(Verificacion.DUPLICADO);

        verifyNoInteractions(onvoService, onvoCapturaService);
    }

    @Test
    @DisplayName("Sesión de un pago que no es ONVO (p. ej. un pago manual) → no se toca")
    void pagoNoOnvo() {
        pago.setProveedor("SINPE");
        assertThat(provider.procesarPagoVerificado("cs_1", "webhook")).isEqualTo(Verificacion.NO_ENCONTRADO);
        verifyNoInteractions(onvoService, onvoCapturaService);
    }

    @Test
    @DisplayName("payment-intent.failed confirmado por ONVO: se registra y no se cancela ni se marca fallido")
    void intentFallidoSoloSeRegistra() {
        doReturn(Map.of("status", "failed")).when(onvoService).obtenerPaymentIntent("pi_9");
        assertThat(provider.registrarIntentFallido("pi_9", "webhook")).isTrue();
        verify(onvoCapturaService).registrar(eq("pi_9"), eq(OnvoPaymentProvider.EVENTO_INTENT_FALLIDO), anyString(), eq("webhook"));
        verify(onvoCapturaService, never()).capturarVerificado(any(), any(), any());
        verify(pagoRepository, never()).save(any());
    }

    @Test
    @DisplayName("payment-intent.failed que ONVO no confirma (o repetido) → no se registra")
    void intentFallidoNoConfirmado() {
        doReturn(Map.of("status", "succeeded")).when(onvoService).obtenerPaymentIntent("pi_9");
        assertThat(provider.registrarIntentFallido("pi_9", "webhook")).isFalse();

        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo("pi_9", OnvoPaymentProvider.EVENTO_INTENT_FALLIDO))
            .thenReturn(true);
        assertThat(provider.registrarIntentFallido("pi_9", "webhook")).isFalse();
        verify(onvoCapturaService, never()).registrar(any(), any(), any(), any());
    }
}
