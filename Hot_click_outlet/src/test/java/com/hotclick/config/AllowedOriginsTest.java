package com.hotclick.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AllowedOrigins — fuente única fail-closed")
class AllowedOriginsTest {

    @Test
    @DisplayName("sin propiedad → lista vacía, no permite nada")
    void ausenteRechazaTodo() {
        var a = new AllowedOrigins("");
        assertThat(a.lista()).isEmpty();
        assertThat(a.permite("https://hotclick.lat")).isFalse();
        assertThat(new AllowedOrigins(null).permite("https://hotclick.lat")).isFalse();
    }

    @Test
    @DisplayName("exacto: puerto distinto, barra final y '*' se rechazan")
    void exacto() {
        var a = new AllowedOrigins(" https://hotclick.lat , *,https://www.hotclick.lat");
        assertThat(a.permite("https://hotclick.lat")).isTrue();
        assertThat(a.permite("https://HOTCLICK.lat")).isTrue();
        assertThat(a.permite("https://hotclick.lat:8443")).isFalse();
        assertThat(a.permite("https://hotclick.lat/")).isFalse();
        assertThat(a.permite("*")).isFalse();
        assertThat(a.permite("https://evil.example.com")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "  ", "*", "https://hotclick.lat,*", "https://*.hotclick.lat",
        "https://hotclick.lat,http://localhost:3000", "http://127.0.0.1:3000", "http://LOCALHOST:5173"})
    @DisplayName("prod: vacío, '*' o localhost/127.0.0.1 → problema crítico")
    void prodInvalido(String raw) {
        assertThat(AllowedOrigins.problemaEnProduccion(raw)).isNotNull();
    }

    @Test
    @DisplayName("prod: solo dominios reales → sin problema")
    void prodValido() {
        assertThat(AllowedOrigins.problemaEnProduccion("https://hotclick.lat,https://www.hotclick.lat")).isNull();
    }
}
