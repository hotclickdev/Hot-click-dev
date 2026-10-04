package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Clave numérica Hacienda — 50 dígitos")
class ClaveNumericaServiceTest {

    private final ClaveNumericaService service = new ClaveNumericaService();

    @Test
    @DisplayName("fecha de dos dígitos, cédula con ceros y seguridad de 8")
    void layoutOficial() {
        LocalDateTime fecha = LocalDateTime.of(2026, 9, 30, 10, 0);
        String consecutivo = ClaveNumericaService.buildNumeroConsecutivo("04", 1);

        String clave = service.armar("3101123456", consecutivo, fecha, "12345678");

        assertThat(clave).hasSize(50);
        assertThat(clave).isEqualTo("506300926003101123456" + consecutivo + "112345678");
        assertThat(clave).doesNotContain("2026");
        assertThat(clave.substring(42)).isEqualTo("12345678");
    }

    @Test
    @DisplayName("cédula física de 9 dígitos se rellena a 12")
    void cedulaConCeros() {
        LocalDateTime fecha = LocalDateTime.of(2026, 1, 2, 8, 0);
        String consecutivo = "00100001040000000007";

        String clave = service.armar("101110111", consecutivo, fecha, "00000001");

        assertThat(clave).startsWith("506020126000101110111");
        assertThat(clave).hasSize(50);
    }

    @Test
    @DisplayName("generar usa seguridad aleatoria de 8 dígitos")
    void seguridadAleatoria() {
        String clave = service.generar(
            "3101123456",
            ClaveNumericaService.buildNumeroConsecutivo("04", 3),
            LocalDateTime.of(2026, 9, 30, 12, 0));

        assertThat(clave).hasSize(50).matches("\\d{50}");
        assertThat(clave.substring(42)).matches("\\d{8}");
    }
}
