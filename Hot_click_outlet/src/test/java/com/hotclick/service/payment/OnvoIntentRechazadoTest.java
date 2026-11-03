package com.hotclick.service.payment;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

/** QA5 MEDIO: ONVO no tiene status «failed»; el rechazo es requires_payment_method + lastPaymentError (o canceled). */
class OnvoIntentRechazadoTest {

    private static final Map<String, Object> ERROR = Map.of("type", "card_error", "message", "declined");

    private static boolean r(Map<String, Object> intent) {
        return OnvoCobroVerificador.intentRechazado(intent, "test");
    }

    @Test
    void declinadoConErrorEsRechazo() {
        assertThat(r(Map.of("status", "requires_payment_method", "lastPaymentError", ERROR, "mode", "test"))).isTrue();
    }

    @Test
    void canceladoEsRechazo() {
        assertThat(r(Map.of("status", "canceled", "mode", "test"))).isTrue();
    }

    @Test
    void estadoInicialSinErrorNoEsRechazo() {
        assertThat(r(Map.of("status", "requires_payment_method", "mode", "test"))).isFalse();
        assertThat(r(Map.of("status", "requires_payment_method", "lastPaymentError", Map.of(), "mode", "test"))).isFalse();
    }

    @Test
    void otrosEstadosNoSonRechazo() {
        assertThat(r(Map.of("status", "succeeded", "lastPaymentError", ERROR, "mode", "test"))).isFalse();
        assertThat(r(Map.of("status", "processing", "lastPaymentError", ERROR, "mode", "test"))).isFalse();
        assertThat(r(Map.of("status", "failed", "mode", "test"))).isFalse();
    }

    @Test
    void failClosedModoDistintoOVacio() {
        assertThat(r(Map.of("status", "canceled", "mode", "live"))).isFalse();
        assertThat(r(Map.of())).isFalse();
        assertThat(OnvoCobroVerificador.intentRechazado(null, "test")).isFalse();
    }
}
