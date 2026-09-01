package com.hotclick.service.pos;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("productoId de ítems del QR POS")
class PosQrProductoIdTest {

    @Test
    @DisplayName("Acepta número (JSON Jackson)")
    void aceptaNumero() {
        assertThat(PosQrSessionService.productoIdDe(Map.of("productoId", 42))).isEqualTo(42L);
        assertThat(PosQrSessionService.productoIdDe(Map.of("productoId", 42L))).isEqualTo(42L);
    }

    @Test
    @DisplayName("Acepta string numérico (ids del front)")
    void aceptaStringNumerico() {
        assertThat(PosQrSessionService.productoIdDe(Map.of("productoId", "42"))).isEqualTo(42L);
        assertThat(PosQrSessionService.productoIdDe(Map.of("productoId", " 7 "))).isEqualTo(7L);
    }

    @Test
    @DisplayName("Rechaza id ausente o no numérico")
    void rechazaAusenteOInvalido() {
        assertThatThrownBy(() -> PosQrSessionService.productoIdDe(Map.of()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("productoId");
        assertThatThrownBy(() -> PosQrSessionService.productoIdDe(Map.of("productoId", "abc")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("productoId");
    }
}
