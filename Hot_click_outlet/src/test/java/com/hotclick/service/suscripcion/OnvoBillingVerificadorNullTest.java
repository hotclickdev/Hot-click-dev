package com.hotclick.service.suscripcion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Sonar S2259 (#300): datos nulos o incompletos de ONVO se rechazan (fail-closed), nunca NPE. */
class OnvoBillingVerificadorNullTest {

    private static final OnvoBillingVerificador.PrecioPlan PRECIOS = p -> null;

    @Test
    @DisplayName("alta por intent con mapas nulos: rechazo, sin NPE")
    void altaConNulos() {
        var r = OnvoBillingVerificador.altaPorIntent(new OnvoBillingVerificador.AltaObjetos(null, null, null), "pi_1", "sub_1", "test", p -> "PYME", PRECIOS);
        assertThat(r.aceptado()).isFalse();
    }

    @Test
    @DisplayName("renovación con mapas nulos: rechazo, sin NPE")
    void renovacionConNulos() {
        var r = OnvoBillingVerificador.renovacion(null, null, "inv_1", "sub_1", "test", p -> "PYME", PRECIOS);
        assertThat(r.aceptado()).isFalse();
    }

    @Test
    @DisplayName("alta por intent sin monto ni precio del plan: rechazo, sin NPE")
    void altaSinMontoNiPrecio() {
        Map<String, Object> intent = Map.of("id", "pi_1", "mode", "test", "status", "succeeded",
            "customerId", "cus_1", "currency", "CRC");
        Map<String, Object> sub = Map.of("id", "sub_1", "mode", "test", "status", "active",
            "customerId", "cus_1", "currentPeriodEnd", "2026-11-26T00:00:00Z");
        Map<String, Object> factura = Map.of("mode", "test", "paymentIntentId", "pi_1",
            "subscriptionId", "sub_1", "customerId", "cus_1");
        var r = OnvoBillingVerificador.altaPorIntent(new OnvoBillingVerificador.AltaObjetos(intent, factura, sub), "pi_1", "sub_1", "test", p -> "PYME", PRECIOS);
        assertThat(r.aceptado()).isFalse();
    }
}
