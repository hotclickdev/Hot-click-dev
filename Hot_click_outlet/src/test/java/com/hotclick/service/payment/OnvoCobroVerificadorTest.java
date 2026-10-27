package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.service.payment.OnvoCobroVerificador.Decision;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ONVO | el cobro se acepta solo si ONVO lo confirma con el monto exacto en céntimos")
class OnvoCobroVerificadorTest {

    private static Pago pago(int colones) {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("HC-1");
        Pago p = new Pago();
        p.setMonto(colones);
        p.setMoneda("CRC");
        p.setPedido(pedido);
        return p;
    }

    private static Map<String, Object> sesion(String paymentStatus, String status) {
        Map<String, Object> s = new HashMap<>();
        s.put("id", "cs_1");
        s.put("paymentStatus", paymentStatus);
        s.put("status", status);
        s.put("paymentIntentId", "pi_1");
        s.put("mode", "live");
        return s;
    }

    private static Map<String, Object> intent(String status, Object amount, String currency) {
        Map<String, Object> i = new HashMap<>();
        i.put("id", "pi_1");
        i.put("status", status);
        i.put("amount", amount);
        i.put("currency", currency);
        i.put("mode", "live");
        return i;
    }

    @Test
    @DisplayName("Sesión paid/complete + intent succeeded + monto ×100 en CRC → se acepta")
    void aceptaMontoEnCentimos() {
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"),
            intent("succeeded", 1_250_000, "CRC"), "live")).isEqualTo(Decision.ACEPTAR);
    }

    @Test
    @DisplayName("ONVO manda el monto con decimales (1250000.0) → igual se acepta")
    void aceptaMontoConDecimalesCero() {
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"),
            intent("succeeded", "1250000.0", "CRC"), "live")).isEqualTo(Decision.ACEPTAR);
    }

    @Test
    @DisplayName("Bug de #157: comparar céntimos contra colones. Un intent por 12.500 céntimos (₡125) no paga ₡12.500")
    void rechazaMontoEnColones() {
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"),
            intent("succeeded", 12_500, "CRC"), "live")).isEqualTo(Decision.RECHAZAR_MONTO);
    }

    @Test
    @DisplayName("Monto distinto, moneda distinta o sin monto → se rechaza")
    void rechazaDatosDistintos() {
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"),
            intent("succeeded", 1_249_900, "CRC"), "live")).isEqualTo(Decision.RECHAZAR_MONTO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"),
            intent("succeeded", 1_250_000, "USD"), "live")).isEqualTo(Decision.RECHAZAR_MONTO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"),
            intent("succeeded", null, "CRC"), "live")).isEqualTo(Decision.RECHAZAR_MONTO);
    }

    @Test
    @DisplayName("El intent leído tiene que ser el de la sesión")
    void rechazaOtroIntent() {
        Map<String, Object> otro = intent("succeeded", 1_250_000, "CRC");
        otro.put("id", "pi_ajeno");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"), otro, "live"))
            .isEqualTo(Decision.RECHAZAR_MONTO);
    }

    @Test
    @DisplayName("Sesión sin pagar, abierta o vencida, o intent no succeeded → no está pagado")
    void noPagado() {
        Map<String, Object> ok = intent("succeeded", 1_250_000, "CRC");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("unpaid", "open"), ok, "live")).isEqualTo(Decision.NO_PAGADO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "expired"), ok, "live")).isEqualTo(Decision.NO_PAGADO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"),
            intent("canceled", 1_250_000, "CRC"), "live")).isEqualTo(Decision.NO_PAGADO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"),
            intent("failed", 1_250_000, "CRC"), "live")).isEqualTo(Decision.NO_PAGADO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), Map.of(), Map.of(), "live")).isEqualTo(Decision.RECHAZAR_MODO);
    }

    @Test
    @DisplayName("C9: con llave live, sin mode en sesión o intent → RECHAZAR_MODO")
    void liveSinModoSeRechaza() {
        Map<String, Object> s = sesion("paid", "complete");
        s.remove("mode");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), s, intent("succeeded", 1_250_000, "CRC"), "live"))
            .isEqualTo(Decision.RECHAZAR_MODO);
        Map<String, Object> i = intent("succeeded", 1_250_000, "CRC");
        i.remove("mode");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"), i, "live"))
            .isEqualTo(Decision.RECHAZAR_MODO);
    }

    @Test
    @DisplayName("C2: llave live y ONVO dice test → RECHAZAR_MODO; modo esperado desconocido → RECHAZAR_MODO")
    void modoTestConLlaveLiveOModoDesconocido() {
        Map<String, Object> s = sesion("paid", "complete");
        s.put("mode", "test");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), s, intent("succeeded", 1_250_000, "CRC"), "live"))
            .isEqualTo(Decision.RECHAZAR_MODO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"),
            intent("succeeded", 1_250_000, "CRC"), null)).isEqualTo(Decision.RECHAZAR_MODO);
    }

    @Test
    @DisplayName("C9: con llave live, intent sin id → se rechaza")
    void liveSinIdSeRechaza() {
        Map<String, Object> i = intent("succeeded", 1_250_000, "CRC");
        i.remove("id");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "complete"), i, "live"))
            .isEqualTo(Decision.RECHAZAR_MONTO);
    }

    @Test
    @DisplayName("C9: payload incompleto también con llave test (sin mode o sin id) → nunca ACEPTAR")
    void testIncompletoSeRechaza() {
        Map<String, Object> s = sesion("paid", "complete");
        s.put("mode", "test");
        Map<String, Object> i = intent("succeeded", 1_250_000, "CRC");
        i.put("mode", "test");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), s, i, "test")).isEqualTo(Decision.ACEPTAR);
        Map<String, Object> sinModo = new java.util.HashMap<>(i);
        sinModo.remove("mode");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), s, sinModo, "test")).isEqualTo(Decision.RECHAZAR_MODO);
        Map<String, Object> sinId = new java.util.HashMap<>(i);
        sinId.remove("id");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), s, sinId, "test")).isEqualTo(Decision.RECHAZAR_MONTO);
        Map<String, Object> sesionSinIntent = new java.util.HashMap<>(s);
        sesionSinIntent.remove("paymentIntentId");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesionSinIntent, i, "test")).isEqualTo(Decision.RECHAZAR_MONTO);
    }

    @Test
    @DisplayName("Caso 3 QA: sesión paid+open con intent succeeded y monto exacto → se acepta")
    void pagadaAbiertaConIntentSucceededSeAcepta() {
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "open"),
            intent("succeeded", 1_250_000, "CRC"), "live")).isEqualTo(Decision.ACEPTAR);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("PAID", "OPEN"),
            intent("succeeded", 1_250_000, "CRC"), "live")).isEqualTo(Decision.ACEPTAR);
    }

    @Test
    @DisplayName("Caso 3 QA: paid+expired, unpaid, status ausente o desconocido, o intent no succeeded → nunca ACEPTAR")
    void pagadaAbiertaFailClosed() {
        Map<String, Object> ok = intent("succeeded", 1_250_000, "CRC");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "expired"), ok, "live")).isEqualTo(Decision.NO_PAGADO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("unpaid", "open"), ok, "live")).isEqualTo(Decision.NO_PAGADO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("unpaid", "complete"), ok, "live")).isEqualTo(Decision.NO_PAGADO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", null), ok, "live")).isEqualTo(Decision.NO_PAGADO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "raro"), ok, "live")).isEqualTo(Decision.NO_PAGADO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "open"),
            intent("failed", 1_250_000, "CRC"), "live")).isEqualTo(Decision.NO_PAGADO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "open"),
            intent("processing", 1_250_000, "CRC"), "live")).isEqualTo(Decision.EN_PROCESO);
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), sesion("paid", "open"),
            intent("succeeded", 12_500, "CRC"), "live")).isEqualTo(Decision.RECHAZAR_MONTO);
        Map<String, Object> otroModo = sesion("paid", "open");
        otroModo.put("mode", "test");
        assertThat(OnvoCobroVerificador.decidir(pago(12_500), otroModo, ok, "live")).isEqualTo(Decision.RECHAZAR_MODO);
    }

    @Test
    @DisplayName("Caso 3 QA (navegador, checkout hospedado real): payload ONVO test open+paid → se acepta")
    void payloadRealNavegadorOpenPaid() {
        Map<String, Object> s = new HashMap<>(Map.of("id", "test_YsXR2HWxvmHyOgKmzaX6PwkHWA4", "status", "open",
            "paymentStatus", "paid", "paymentIntentId", "cmvp4gxnq0bxok77fl4cu9vlr", "mode", "test"));
        Map<String, Object> i = new HashMap<>(Map.of("id", "cmvp4gxnq0bxok77fl4cu9vlr", "status", "succeeded",
            "amount", 500_000, "currency", "CRC", "mode", "test",
            "metadata", Map.of("pedidoId", "15", "numeroPedido", "ORD-6A440B318BA0")));
        assertThat(OnvoCobroVerificador.decidir(pago(5_000), s, i, "test")).isEqualTo(Decision.ACEPTAR);
        // Mismo payload con llave live → otro modo, nunca se acepta.
        assertThat(OnvoCobroVerificador.decidir(pago(5_000), s, i, "live")).isEqualTo(Decision.RECHAZAR_MODO);
    }
}
