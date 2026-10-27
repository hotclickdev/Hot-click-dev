package com.hotclick.service.ai;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

@DisplayName("ClaudePrecios — tarifa Haiku 4.5")
class ClaudePreciosTest {

    private static final double EPS = 1e-9;

    @Test
    @DisplayName("Los defaults son los de Claude Haiku 4.5: 1.00 / 5.00 / 0.10 / 1.25 por millon")
    void defaultsSonHaiku45() {
        ClaudePrecios p = ClaudePrecios.actual();
        assertThat(p.inputPorM()).isEqualTo(1.00);
        assertThat(p.outputPorM()).isEqualTo(5.00);
        assertThat(p.cacheLecturaPorM()).isEqualTo(0.10);
        assertThat(p.cacheEscrituraPorM()).isEqualTo(1.25);
    }

    @Test
    @DisplayName("1M in + 1M out cuesta US$6.00 (antes, con Haiku 3.5, US$4.80)")
    void costoSinCache() {
        assertThat(ClaudePrecios.actual().costoUsd(1_000_000, 1_000_000)).isCloseTo(6.00, offset(EPS));
    }

    @Test
    @DisplayName("El cache se factura aparte del input")
    void costoConCache() {
        double costo = ClaudePrecios.actual().costoUsd(1_000_000, 1_000_000, 1_000_000, 1_000_000);
        assertThat(costo).isCloseTo(1.00 + 5.00 + 0.10 + 1.25, offset(EPS));
    }

    @Test
    @DisplayName("Los precios son configurables")
    void configurable() {
        ClaudePrecios p = ClaudePrecios.de(2.0, 10.0, 0.2, 2.5);
        assertThat(p.costoUsd(500_000, 100_000, 1_000_000, 0)).isCloseTo(1.0 + 1.0 + 0.2, offset(EPS));
        // de(...) no pisa los precios vigentes
        assertThat(ClaudePrecios.actual().inputPorM()).isEqualTo(1.00);
    }

    @Test
    @DisplayName("El bean toma los precios de ia.precio.* y los publica para codigo estatico")
    void beanPublicaPrecios() {
        try {
            new ClaudePrecios(3.0, 15.0, 0.3, 3.75);
            assertThat(ClaudePrecios.actual().costoUsd(1_000_000, 0)).isCloseTo(3.0, offset(EPS));
        } finally {
            new ClaudePrecios(ClaudePrecios.INPUT_POR_M_DEFECTO, ClaudePrecios.OUTPUT_POR_M_DEFECTO,
                ClaudePrecios.CACHE_LECTURA_POR_M_DEFECTO, ClaudePrecios.CACHE_ESCRITURA_POR_M_DEFECTO);
        }
    }
}
