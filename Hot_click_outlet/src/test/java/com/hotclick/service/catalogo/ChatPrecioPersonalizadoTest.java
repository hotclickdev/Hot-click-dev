package com.hotclick.service.catalogo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ChatPrecioPersonalizado")
class ChatPrecioPersonalizadoTest {

    @Test
    @DisplayName("Cotización nunca expone ₡1")
    void cotizacion_aCotizar() {
        String etiqueta = ChatPrecioPersonalizado.etiqueta(
            true, "COTIZACION", 1, null, null, null);
        assertThat(etiqueta).isEqualTo("A cotizar");
        assertThat(etiqueta).doesNotContain("1");
        assertThat(ChatPrecioPersonalizado.precioNumerico(true, "COTIZACION", 1, null, null))
            .isNull();
    }

    @Test
    @DisplayName("Rango muestra desde-hasta")
    void rango_desdeHasta() {
        String etiqueta = ChatPrecioPersonalizado.etiqueta(
            true, "RANGO", 1, null, 15000, 40000);
        assertThat(etiqueta).contains("Desde");
        assertThat(etiqueta).contains("15");
        assertThat(etiqueta).contains("40");
    }

    @Test
    @DisplayName("CTA ficha solo si no es FIJO")
    void ctaFicha() {
        assertThat(ChatPrecioPersonalizado.requiereFichaEncargo(true, "COTIZACION")).isTrue();
        assertThat(ChatPrecioPersonalizado.requiereFichaEncargo(true, "RANGO")).isTrue();
        assertThat(ChatPrecioPersonalizado.requiereFichaEncargo(true, "FIJO")).isFalse();
        assertThat(ChatPrecioPersonalizado.requiereFichaEncargo(false, null)).isFalse();
    }

    @Test
    @DisplayName("Mapa JDBC de cotización")
    void desdeMap() {
        String e = ChatPrecioPersonalizado.etiquetaDesdeMap(Map.of(
            "es_personalizado", true,
            "modo_precio_personalizado", "COTIZACION",
            "precio_venta", 1
        ));
        assertThat(e).isEqualTo("A cotizar");
    }
}
