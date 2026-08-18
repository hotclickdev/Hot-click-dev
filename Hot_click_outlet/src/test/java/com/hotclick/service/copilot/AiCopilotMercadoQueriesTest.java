package com.hotclick.service.copilot;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Token de búsqueda para comparar catálogo público")
class AiCopilotMercadoQueriesTest {

    @Test
    @DisplayName("Usa la primera palabra de 4+ letras")
    void tokenBusqueda() {
        assertThat(AiCopilotMercadoQueries.tokenBusqueda("Clavadora inalámbrica V20")).isEqualTo("Clavadora");
        assertThat(AiCopilotMercadoQueries.tokenBusqueda("")).isEqualTo("producto");
        assertThat(AiCopilotMercadoQueries.tokenBusqueda("sol")).isEqualTo("sol");
    }

    @Test
    @DisplayName("Percentil 0 si todos los públicos son más caros")
    void percentilBarato() {
        assertThat(AiCopilotMercadoQueries.percentilPrecio(1000, java.util.List.of(2000L, 3000L))).isEqualTo(0);
    }

    @Test
    @DisplayName("Percentil alto si el propio es más caro que el típico")
    void percentilCaro() {
        assertThat(AiCopilotMercadoQueries.percentilPrecio(5000, java.util.List.of(1000L, 2000L, 3000L))).isEqualTo(100);
    }

    @Test
    @DisplayName("Frase: más caro / más barato / cerca del típico")
    void fraseVsTipico() {
        assertThat(AiCopilotMercadoQueries.fraseVsTipico(80, "Herramientas"))
            .contains("más caro que el típico de Herramientas");
        assertThat(AiCopilotMercadoQueries.fraseVsTipico(20, "Herramientas"))
            .contains("más barato que el típico de Herramientas");
        assertThat(AiCopilotMercadoQueries.fraseVsTipico(50, "Herramientas"))
            .contains("cerca del típico de Herramientas");
        assertThat(AiCopilotMercadoQueries.fraseVsTipico(-1, ""))
            .contains("No hay suficientes");
    }
}
