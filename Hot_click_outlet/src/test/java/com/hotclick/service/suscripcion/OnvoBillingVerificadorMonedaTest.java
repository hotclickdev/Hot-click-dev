package com.hotclick.service.suscripcion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verificador de billing ONVO: la moneda y el monto se validan contra el precio esperado del plan (config / price de
 * ONVO), sin moneda ni monto fijos en el código. Regresión del cambio de CRC fijo a USD por plan.
 */
class OnvoBillingVerificadorMonedaTest {

    private static final String MODO = "live";
    private static final long PRECIO = 2_400;
    private static final OnvoBillingVerificador.PrecioPlan PRECIOS = (plan, priceId) ->
        "PYME".equals(plan) && "price_pyme".equals(priceId) ? new OnvoBillingVerificador.PrecioEsperado("usd", PRECIO) : null;

    private static Map<String, Object> sub() {
        Map<String, Object> m = new HashMap<>();
        m.put("id", "sub_1"); m.put("mode", MODO); m.put("status", "active"); m.put("customerId", "cus_1");
        m.put("currentPeriodEnd", "2026-12-01T06:00:00.000Z");
        m.put("items", List.of(Map.of("id", "item_1", "priceId", "price_pyme")));
        return m;
    }

    private static Map<String, Object> factura(String moneda, Object total) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", "inv_1"); m.put("subscriptionId", "sub_1"); m.put("customerId", "cus_1"); m.put("status", "paid");
        m.put("mode", MODO); m.put("currency", moneda); m.put("total", total);
        m.put("periodEnd", "2026-12-01T06:00:00.000Z");
        return m;
    }

    private static OnvoBillingVerificador.Resultado renovacion(Map<String, Object> factura) {
        return OnvoBillingVerificador.renovacion(factura, sub(), "inv_1", "sub_1", MODO, p -> "PYME", PRECIOS);
    }

    @Test
    @DisplayName("un pago en USD que coincide con el precio del plan activa (la moneda no distingue mayúsculas)")
    void usdQueCoincideActiva() {
        assertThat(renovacion(factura("USD", PRECIO)).aceptado()).isTrue();
        assertThat(renovacion(factura("usd", PRECIO)).aceptado()).isTrue();
        assertThat(renovacion(factura("USD", PRECIO)).planNombre()).isEqualTo("PYME");
    }

    @Test
    @DisplayName("un pago en USD con monto menor no activa (pago_parcial); mayor tampoco (monto); 0 o sin monto tampoco")
    void usdConMontoDistintoNoActiva() {
        assertThat(renovacion(factura("USD", PRECIO - 1)).motivo()).isEqualTo("pago_parcial");
        assertThat(renovacion(factura("USD", PRECIO + 1)).motivo()).isEqualTo("monto");
        assertThat(renovacion(factura("USD", 0)).motivo()).isEqualTo("monto");
        assertThat(renovacion(factura("USD", null)).motivo()).isEqualTo("monto");
    }

    @Test
    @DisplayName("una moneda distinta a la del price no activa, aunque el monto numérico coincida; sin moneda tampoco")
    void monedaDistintaNoActiva() {
        assertThat(renovacion(factura("CRC", PRECIO)).motivo()).isEqualTo("moneda");
        assertThat(renovacion(factura("EUR", PRECIO)).motivo()).isEqualTo("moneda");
        assertThat(renovacion(factura(null, PRECIO)).motivo()).isEqualTo("moneda");
    }

    @Test
    @DisplayName("sin precio esperado del plan (config o price de ONVO sin confirmar) no se activa: plan_sin_precio")
    void sinPrecioEsperadoNoActiva() {
        var sinPrecio = OnvoBillingVerificador.renovacion(factura("USD", PRECIO), sub(), "inv_1", "sub_1", MODO,
            p -> "PYME", (plan, priceId) -> null);
        assertThat(sinPrecio.motivo()).isEqualTo("plan_sin_precio");
        var sinMoneda = OnvoBillingVerificador.renovacion(factura("USD", PRECIO), sub(), "inv_1", "sub_1", MODO,
            p -> "PYME", (plan, priceId) -> new OnvoBillingVerificador.PrecioEsperado(" ", PRECIO));
        assertThat(sinMoneda.motivo()).isEqualTo("plan_sin_precio");
        var precioCero = OnvoBillingVerificador.renovacion(factura("USD", PRECIO), sub(), "inv_1", "sub_1", MODO,
            p -> "PYME", (plan, priceId) -> new OnvoBillingVerificador.PrecioEsperado("usd", 0));
        assertThat(precioCero.motivo()).isEqualTo("plan_sin_precio");
    }

    @Test
    @DisplayName("el verificador pide el precio del priceId de la suscripción, no uno fijo")
    void usaElPriceIdDeLaSuscripcion() {
        Map<String, Object> otroPrice = sub();
        otroPrice.put("items", List.of(Map.of("id", "item_1", "priceId", "price_otro")));
        var r = OnvoBillingVerificador.renovacion(factura("USD", PRECIO), otroPrice, "inv_1", "sub_1", MODO,
            p -> "PYME", PRECIOS);
        assertThat(r.motivo()).isEqualTo("plan_sin_precio");
    }
}
