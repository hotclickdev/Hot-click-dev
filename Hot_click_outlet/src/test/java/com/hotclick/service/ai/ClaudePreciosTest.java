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
            new ClaudePrecios(3.0, 15.0, 0.3, 3.75, 3.0, 15.0, 0.3, 3.75);
            assertThat(ClaudePrecios.actual().costoUsd(1_000_000, 0)).isCloseTo(3.0, offset(EPS));
        } finally {
            new ClaudePrecios(ClaudePrecios.INPUT_POR_M_DEFECTO, ClaudePrecios.OUTPUT_POR_M_DEFECTO,
                ClaudePrecios.CACHE_LECTURA_POR_M_DEFECTO, ClaudePrecios.CACHE_ESCRITURA_POR_M_DEFECTO,
                ClaudePrecios.SONNET_INPUT_POR_M_DEFECTO, ClaudePrecios.SONNET_OUTPUT_POR_M_DEFECTO,
                ClaudePrecios.SONNET_CACHE_LECTURA_POR_M_DEFECTO, ClaudePrecios.SONNET_CACHE_ESCRITURA_POR_M_DEFECTO);
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(doubles = {-0.01, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY})
    @DisplayName("Rechaza precios negativos, NaN o infinitos (falla el arranque)")
    void rechazaPreciosInvalidos(double malo) {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> ClaudePrecios.de(malo, 5, 0.1, 1.25))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("input-por-m");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> ClaudePrecios.de(1, 5, 0.1, malo))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("cache-escritura-por-m");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new ClaudePrecios(1, 5, 0.1, 1.25, 3, malo, 0.3, 3.75))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("output-por-m");
    }

    @Test
    @DisplayName("Cero es valido (modelo gratis / pruebas)")
    void ceroEsValido() {
        assertThat(ClaudePrecios.de(0, 0, 0, 0).costoUsd(1_000_000, 1_000_000)).isZero();
    }

    @Test
    @DisplayName("Sonnet 4.6 usa su tarifa publica 3 / 15 / 0.30 / 3.75; Haiku y otros la principal")
    void tarifaPorModelo() {
        ClaudePrecios p = ClaudePrecios.actual();
        ClaudePrecios s = p.paraModelo("claude-sonnet-4-6");
        assertThat(s.inputPorM()).isEqualTo(3.00);
        assertThat(s.outputPorM()).isEqualTo(15.00);
        assertThat(s.cacheLecturaPorM()).isEqualTo(0.30);
        assertThat(s.cacheEscrituraPorM()).isEqualTo(3.75);
        assertThat(s.costoUsd(1_000_000, 1_000_000)).isCloseTo(18.00, offset(EPS));
        assertThat(p.paraModelo("claude-haiku-4-5-20251001")).isSameAs(p);
        assertThat(p.paraModelo(null)).isSameAs(p);
        assertThat(p.sonnet().comoMapa()).containsEntry("outputPorM", 15.00);
    }
}
