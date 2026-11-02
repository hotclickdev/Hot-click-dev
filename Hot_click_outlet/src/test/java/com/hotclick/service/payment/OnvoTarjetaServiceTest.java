package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.TransaccionPago;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.TransaccionPagoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("QA5 BAJO | cardLast4/cardBrand desde paymentMethod.card de ONVO, sin PII")
class OnvoTarjetaServiceTest {

    private static Map<String, Object> intent(Object brand, Object last4) {
        Map<String, Object> card = new HashMap<>();
        card.put("brand", brand);
        card.put("last4", last4);
        card.put("wallet", null);
        return Map.of("id", "pi_1", "status", "succeeded",
            "paymentMethod", Map.of("type", "card", "card", card));
    }

    @Test
    @DisplayName("extrae brand y last4 de paymentMethod.card (campos de la doc de ONVO)")
    void extrae() {
        var t = OnvoTarjetaService.extraer(intent("Visa", "3599"));
        assertThat(t.brand()).isEqualTo("Visa");
        assertThat(t.last4()).isEqualTo("3599");
    }

    @Test
    @DisplayName("formato inválido o ausente → null (nunca un PAN ni texto arbitrario)")
    void invalidos() {
        var t = OnvoTarjetaService.extraer(intent("<script>", "4111111111111111"));
        assertThat(t.brand()).isNull();
        assertThat(t.last4()).isNull();
        assertThat(OnvoTarjetaService.extraer(intent("Mastercard Gold Premium Edition XL", "12a4")).vacia()).isTrue();
        assertThat(OnvoTarjetaService.extraer(Map.of("paymentMethod", "pm_123")).vacia()).isTrue();
        assertThat(OnvoTarjetaService.extraer(null).vacia()).isTrue();
    }

    @Test
    @DisplayName("tras la captura guarda una transacción con solo marca y last4; un fallo de ONVO no rompe nada")
    void guardaYFailSafe() {
        OnvoService onvo = mock(OnvoService.class);
        PagoRepository pagos = mock(PagoRepository.class);
        TransaccionPagoRepository txs = mock(TransaccionPagoRepository.class);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        OnvoTarjetaService s = new OnvoTarjetaService();
        ReflectionTestUtils.setField(s, "onvoService", onvo);
        ReflectionTestUtils.setField(s, "pagoRepository", pagos);
        ReflectionTestUtils.setField(s, "transaccionPagoRepository", txs);
        ReflectionTestUtils.setField(s, "txManager", tm);
        Pago pago = new Pago();
        pago.setId(5L);
        pago.setMonto(10000);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        when(pagos.findByMerchantToken("cs_t")).thenReturn(Optional.of(pago));
        doReturn(Map.of("paymentIntentId", "pi_1")).when(onvo).obtenerCheckoutSession("cs_t");
        doReturn(intent("Visa", "3599")).when(onvo).obtenerPaymentIntent("pi_1");

        s.despuesDeCaptura("cs_t"); // sin transacción activa: corre directo
        ArgumentCaptor<TransaccionPago> c = ArgumentCaptor.forClass(TransaccionPago.class);
        verify(txs).save(c.capture());
        assertThat(c.getValue().getCardLast4()).isEqualTo("3599");
        assertThat(c.getValue().getCardBrand()).isEqualTo("VISA");
        assertThat(c.getValue().getPayloadRespuesta()).isNull();

        when(onvo.obtenerCheckoutSession("cs_x")).thenThrow(new RuntimeException("onvo caído"));
        assertThatCode(() -> s.despuesDeCaptura("cs_x")).doesNotThrowAnyException();
        verify(txs, times(1)).save(any());
    }
}
