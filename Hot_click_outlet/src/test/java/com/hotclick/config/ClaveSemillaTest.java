package com.hotclick.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ClaveSemilla — contraseñas de cuentas sembradas")
class ClaveSemillaTest {

    @Test
    @DisplayName("Producción: app.url pública por https o perfil prod")
    void detectaProduccion() {
        assertThat(ClaveSemilla.esProduccion("https://hotclick.lat", new String[0])).isTrue();
        assertThat(ClaveSemilla.esProduccion("http://localhost:8080", new String[] {"prod"})).isTrue();
        assertThat(ClaveSemilla.esProduccion("http://localhost:8080", new String[] {"dev"})).isFalse();
        assertThat(ClaveSemilla.esProduccion("https://localhost:3000", null)).isFalse();
        assertThat(ClaveSemilla.esProduccion(null, null)).isFalse();
    }

    @Test
    @DisplayName("Rechaza claves cortas, de pocos tipos o con secuencias obvias")
    void rechazaClavesDebiles() {
        assertThat(ClaveSemilla.esFuerte(null)).isFalse();
        assertThat(ClaveSemilla.esFuerte("Corta1!")).isFalse();
        assertThat(ClaveSemilla.esFuerte("solominusculaslargas")).isFalse();
        assertThat(ClaveSemilla.esFuerte("Admin" + "1234" + "!xyzW")).isFalse();
        assertThat(ClaveSemilla.esFuerte("Hotclick" + "Segura#99")).isFalse();
        assertThat(ClaveSemilla.esFuerte("Prueba" + "Larga#2026")).isFalse();
    }

    @Test
    @DisplayName("Acepta una clave larga y variada")
    void aceptaClaveFuerte() {
        assertThat(ClaveSemilla.esFuerte("Zq9#" + UUID.randomUUID())).isTrue();
    }

    @Test
    @DisplayName("Lee la primera variable con valor y trata vacío como ausente")
    void leePrimeraVariableConValor() {
        Map<String, String> env = Map.of("A", " ", "B", "valor-b");
        assertThat(ClaveSemilla.leer(env::get, "A", "B")).contains("valor-b");
        assertThat(ClaveSemilla.leer(env::get, "A", "C")).isEmpty();
    }

    @Test
    @DisplayName("La clave aleatoria cambia en cada llamada")
    void aleatoriaNoSeRepite() {
        String a = ClaveSemilla.aleatoriaInutilizable();
        assertThat(a).hasSizeGreaterThanOrEqualTo(40).isNotEqualTo(ClaveSemilla.aleatoriaInutilizable());
    }
}
