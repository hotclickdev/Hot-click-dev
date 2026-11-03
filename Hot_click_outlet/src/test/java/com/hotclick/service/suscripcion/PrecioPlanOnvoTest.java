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
    @DisplayName("A1: sin moneda, sin precio del plan o con fracción de centavo es configuración faltante (transitoria); sin consultar a ONVO")
    void configIncompletaLanza() {
        assertThatThrownBy(() -> con("").esperado("PYME", "price_pyme"))
            .isInstanceOf(ConfigBillingFaltanteException.class).hasMessageContaining("PLANES_MONEDA");
        assertThatThrownBy(() -> con(null).esperado("PYME", "price_pyme")).isInstanceOf(ConfigBillingFaltanteException.class);
        assertThatThrownBy(() -> con("usd").esperado("PLAN_X", "price_pyme"))
            .isInstanceOf(ConfigBillingFaltanteException.class).hasMessageContaining("PLAN_X_PRECIO_MENSUAL_USD");
        var fraccion = new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24.005", "49", "usd"), onvo);
        assertThatThrownBy(() -> fraccion.esperado("PYME", "price_pyme")).isInstanceOf(ConfigBillingFaltanteException.class);
        assertThat(con("usd").esperado("PYME", null)).isNull(); // sin price: no hay precio (permanente)
        verify(onvo, never()).obtenerPrecio(any());
    }

    @Test
    @DisplayName("A1: planParaPriceId: price de un plan → plan; sin plan → null si los ids están configurados, config faltante si no")
    void planParaPriceIdDistingueConfigDePriceAjeno() {
        when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
        assertThat(con("usd").planParaPriceId("price_pyme")).isEqualTo("PYME");
        when(onvo.faltanPriceIds()).thenReturn(false);
        assertThat(con("usd").planParaPriceId("price_ajeno")).isNull();
        when(onvo.faltanPriceIds()).thenReturn(true);
        assertThatThrownBy(() -> con("usd").planParaPriceId("price_ajeno"))
            .isInstanceOf(ConfigBillingFaltanteException.class).hasMessageContaining("ONVO_PRICE_ID_*");
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

    private static OnvoBillingClient clienteReal(String pyme, String plus) {
        OnvoBillingClient c = new OnvoBillingClient(new org.springframework.web.client.RestTemplate());
        org.springframework.test.util.ReflectionTestUtils.setField(c, "priceIdPyme", pyme);
        org.springframework.test.util.ReflectionTestUtils.setField(c, "priceIdNegocioPlus", plus);
        return c;
    }

    @Test
    @DisplayName("Seguridad #391: falta solo uno de los dos ONVO_PRICE_ID: el price desconocido es transitorio y el configurado sigue resolviendo")
    void faltaSoloUnPriceIdEsTransitorioParaElDesconocido() {
        for (String[] ids : new String[][] {{"price_pyme", null}, {null, "price_plus"}, {"price_pyme", "  "}}) {
            PrecioPlanOnvo precio = new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", "usd"), clienteReal(ids[0], ids[1]));
            assertThat(clienteReal(ids[0], ids[1]).faltanPriceIds()).isTrue();
            // un price que no es ninguno de los configurados no se puede clasificar: config faltante, no price_desconocido permanente
            assertThatThrownBy(() -> precio.planParaPriceId("price_cualquiera"))
                .isInstanceOf(ConfigBillingFaltanteException.class)
                .hasMessageContaining("ONVO_PRICE_ID_*");
            // el que sí está configurado se sigue clasificando
            String configurado = ids[0] != null ? ids[0] : ids[1];
            assertThat(precio.planParaPriceId(configurado)).isEqualTo(ids[0] != null ? "PYME" : "NEGOCIO_PLUS");
        }
        // con ambos configurados, un price ajeno es desconocido permanente (null), sin excepción
        PrecioPlanOnvo completo = new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", "usd"),
            clienteReal("price_pyme", "price_plus"));
        assertThat(completo.planParaPriceId("price_ajeno")).isNull();
    }
}
