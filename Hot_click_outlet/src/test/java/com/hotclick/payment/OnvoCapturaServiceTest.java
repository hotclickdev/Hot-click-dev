package com.hotclick.payment;

import com.hotclick.model.Pago;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.PaymentService;
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
    @InjectMocks OnvoCapturaService captura;

    private Pago pago;

    @BeforeEach
    void armar() {
        pago = new Pago();
        pago.setMerchantToken("cs_1");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        when(pagoRepository.findByMerchantToken("cs_1")).thenReturn(Optional.of(pago));
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo(anyString(), anyString())).thenReturn(false);
    }

    @Test
    @DisplayName("Pago ONVO pendiente → se captura y se confirma el pedido")
    void capturaOnvoPendiente() {
        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isTrue();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        verify(paymentService).confirmarPedido(pago);
    }

    @Test
    @DisplayName("Pago de otro proveedor con el mismo token → no se toca")
    void otroProveedorNoSeCaptura() {
        pago.setProveedor("SINPE");
        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isFalse();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        verify(paymentService, never()).confirmarPedido(any());
    }

    @Test
    @DisplayName("Otra entrega ya lo capturó (carrera entre webhook y limpieza) → no se confirma dos veces")
    void duplicadoNoSeConfirmaDosVeces() {
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo("cs_1", OnvoPaymentProvider.EVENTO_SESION))
            .thenReturn(true);
        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isFalse();

        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo("cs_1", OnvoPaymentProvider.EVENTO_SESION))
            .thenReturn(false);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isFalse();
        verify(paymentService, never()).confirmarPedido(any());
    }
}
