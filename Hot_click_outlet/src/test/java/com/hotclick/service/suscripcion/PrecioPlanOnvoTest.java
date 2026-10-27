package com.hotclick.service.suscripcion;

import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** Precio esperado del plan: config (moneda y precio) confirmada por el price de ONVO; ante duda, sin precio. */
class PrecioPlanOnvoTest {

    private OnvoBillingClient onvo;

    @BeforeEach
    void setUp() {
        onvo = mock(OnvoBillingClient.class);
        when(onvo.modoEsperado()).thenReturn("test");
    }

    private static Map<String, Object> price(String id, String modo, String moneda, Object unitAmount, Object activo) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id); m.put("mode", modo); m.put("currency", moneda); m.put("unitAmount", unitAmount);
        if (activo != null) m.put("isActive", activo);
        return m;
    }

    private PrecioPlanOnvo con(String moneda) {
        return new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", moneda), onvo);
    }

    @Test
    @DisplayName("config y price de ONVO coinciden: moneda y monto en unidad menor (forma real del sandbox: USD, 2400)")
    void coinciden() {
        doReturn(price("price_pyme", "test", "USD", 2400, true)).when(onvo).obtenerPrecio("price_pyme");
        var e = con("usd").esperado("PYME", "price_pyme");
        assertThat(e).isEqualTo(new OnvoBillingVerificador.PrecioEsperado("usd", 2400));
    }

    @Test
    @DisplayName("el price de ONVO distinto de la config (monto, moneda, modo, id o inactivo) no da precio")
    void noCoinciden() {
        doReturn(price("price_pyme", "test", "USD", 2500, true)).when(onvo).obtenerPrecio("price_pyme");
        assertThat(con("usd").esperado("PYME", "price_pyme")).isNull();
        doReturn(price("price_pyme", "test", "CRC", 2400, true)).when(onvo).obtenerPrecio("price_pyme");
        assertThat(con("usd").esperado("PYME", "price_pyme")).isNull();
        doReturn(price("price_pyme", "live", "USD", 2400, true)).when(onvo).obtenerPrecio("price_pyme");
        assertThat(con("usd").esperado("PYME", "price_pyme")).isNull();
        doReturn(price("price_otro", "test", "USD", 2400, true)).when(onvo).obtenerPrecio("price_pyme");
        assertThat(con("usd").esperado("PYME", "price_pyme")).isNull();
        doReturn(price("price_pyme", "test", "USD", 2400, false)).when(onvo).obtenerPrecio("price_pyme");
        assertThat(con("usd").esperado("PYME", "price_pyme")).isNull();
        doReturn(price("price_pyme", "test", "USD", null, true)).when(onvo).obtenerPrecio("price_pyme");
        assertThat(con("usd").esperado("PYME", "price_pyme")).isNull();
    }

    @Test
    @DisplayName("sin moneda, sin precio del plan, con fracción de centavo o sin priceId: no hay precio y ni se consulta a ONVO")
    void configIncompleta() {
        assertThat(con("").esperado("PYME", "price_pyme")).isNull();
        assertThat(con(null).esperado("PYME", "price_pyme")).isNull();
        assertThat(con("usd").esperado("PLAN_X", "price_pyme")).isNull();
        assertThat(con("usd").esperado("PYME", null)).isNull();
        var fraccion = new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24.005", "49", "usd"), onvo);
        assertThat(fraccion.esperado("PYME", "price_pyme")).isNull();
        verify(onvo, never()).obtenerPrecio(any());
    }

    @Test
    @DisplayName("si el GET del price falla se propaga (el llamador lo trata como transitorio), no es un precio válido")
    void getCaidoSePropaga() {
        doThrow(new IllegalStateException("timeout")).when(onvo).obtenerPrecio("price_pyme");
        assertThatThrownBy(() -> con("usd").esperado("PYME", "price_pyme")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("precio configurado con decimales exactos (9.50 USD = 950)")
    void decimalesExactos() {
        doReturn(price("price_pyme", "test", "USD", 950, true)).when(onvo).obtenerPrecio("price_pyme");
        var cfg = new PreciosPlanesConfig("9", "9.50", "49", "usd");
        assertThat(new PrecioPlanOnvo(cfg, onvo).esperado("PYME", "price_pyme").unidadMenor()).isEqualTo(950);
    }
}
