package com.hotclick.service.telegram;

import com.hotclick.model.PedidoEntrega;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Enlaces de ubicación: lista blanca de Maps y Waze")
class EnlaceUbicacionValidatorTest {

    @Test
    @DisplayName("acepta un enlace de Google Maps con coordenadas en @lat,lng")
    void aceptaGoogleMapsConArroba() {
        var r = EnlaceUbicacionValidator.analizar("https://www.google.com/maps/place/Belen/@9.9876543,-84.1823456,17z").orElseThrow();
        assertThat(r.fuente()).isEqualTo(PedidoEntrega.GOOGLE_MAPS);
        assertThat(r.lat()).isEqualTo(9.9876543);
        assertThat(r.lng()).isEqualTo(-84.1823456);
        assertThat(r.urlNormalizada()).startsWith("https://www.google.com/maps/");
    }

    @Test
    @DisplayName("acepta un enlace de Waze con ll=lat,lng")
    void aceptaWaze() {
        var r = EnlaceUbicacionValidator.analizar("https://waze.com/ul?ll=9.93,-84.08&navigate=yes").orElseThrow();
        assertThat(r.fuente()).isEqualTo(PedidoEntrega.WAZE);
        assertThat(r.lat()).isEqualTo(9.93);
        assertThat(r.lng()).isEqualTo(-84.08);
    }

    @Test
    @DisplayName("un pin de WhatsApp (maps.google.com/?q=lat,lng&ll=…) se trata como Maps con fuente WHATSAPP")
    void pinDeWhatsapp() {
        var r = EnlaceUbicacionValidator.analizar("https://maps.google.com/?q=9.9341,-84.0877&ll=9.9341,-84.0877&z=16").orElseThrow();
        assertThat(r.fuente()).isEqualTo(PedidoEntrega.WHATSAPP);
        assertThat(r.tieneCoordenadas()).isTrue();
    }

    @Test
    @DisplayName("enlaces cortos permitidos se guardan sin seguir la redirección (sin coordenadas)")
    void enlaceCortoNoSeSigue() {
        var r = EnlaceUbicacionValidator.analizar("mirá: https://maps.app.goo.gl/AbCdEf123").orElseThrow();
        assertThat(r.urlNormalizada()).isEqualTo("https://maps.app.goo.gl/AbCdEf123");
        assertThat(r.tieneCoordenadas()).isFalse();
        assertThat(EnlaceUbicacionValidator.analizar("https://goo.gl/maps/xyz123")).isPresent();
    }

    @Test
    @DisplayName("sin esquema pero con host permitido también se acepta (se normaliza a https)")
    void sinEsquema() {
        assertThat(EnlaceUbicacionValidator.analizar("maps.app.goo.gl/AbCd").orElseThrow().urlNormalizada())
            .isEqualTo("https://maps.app.goo.gl/AbCd");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "javascript:alert(1)",
        "JaVaScRiPt:alert(1)//https://maps.google.com/?q=9.9,-84.1",
        "https://evil.example.com/maps?q=9.9,-84.1",
        "https://maps.google.com.evil.com/?q=9.9,-84.1",
        "https://bit.ly/3abcde",
        "https://tinyurl.com/abc",
        "https://goo.gl/otraCosa",
        "https://www.google.com/search?q=maps",
        "https://waze.com/otra-ruta",
        "https://user:pass@maps.google.com/?q=9.9,-84.1",
        "https://maps.google.com:8443/?q=9.9,-84.1",
        "data:text/html,<script>alert(1)</script>",
        "ftp://maps.google.com/x",
        "solo texto sin enlace",
        ""
    })
    @DisplayName("rechaza hosts ajenos, acortadores, javascript:, credenciales y puertos")
    void rechaza(String entrada) {
        assertThat(EnlaceUbicacionValidator.analizar(entrada)).isEmpty();
    }

    @Test
    @DisplayName("rechaza coordenadas fuera de rango y URL demasiado larga")
    void rangosYLargo() {
        assertThat(EnlaceUbicacionValidator.analizar("https://maps.google.com/?q=95.5,-84.1").orElseThrow().tieneCoordenadas()).isFalse();
        assertThat(EnlaceUbicacionValidator.analizar("https://maps.google.com/?q=" + "a".repeat(600))).isEmpty();
    }

    @Test
    @DisplayName("la ubicación nativa de Telegram valida rango y rechaza 0,0")
    void coordenadaTelegram() {
        assertThat(EnlaceUbicacionValidator.coordenadaValida(9.93, -84.08)).isTrue();
        assertThat(EnlaceUbicacionValidator.coordenadaValida(120, 10)).isFalse();
        assertThat(EnlaceUbicacionValidator.coordenadaValida(0, 0)).isFalse();
        assertThat(EnlaceUbicacionValidator.coordenadaValida(Double.NaN, 1)).isFalse();
    }

    @Test
    @DisplayName("maps.google.com: solo raíz (pin de WhatsApp) o rutas de mapas; el resto se rechaza")
    void mapsGoogleComRestringidoARutasDeMapas() {
        assertThat(EnlaceUbicacionValidator.analizar("https://maps.google.com/?q=9.93,-84.08&ll=9.93,-84.08")).isPresent();
        assertThat(EnlaceUbicacionValidator.analizar("https://maps.google.com/maps?q=9.93,-84.08")).isPresent();
        assertThat(EnlaceUbicacionValidator.analizar("https://maps.google.com/maps/place/x/@9.93,-84.08,17z")).isPresent();
        for (String malo : new String[] {
                "https://maps.google.com/url?q=https://evil.invalid", "https://maps.google.com/login",
                "https://maps.google.com/search?q=x", "https://maps.google.com/amp/s/evil.invalid",
                "https://maps.google.com/mapsx", "https://maps.google.com/maps-evil"}) {
            assertThat(EnlaceUbicacionValidator.analizar(malo)).as(malo).isEmpty();
        }
    }
}
