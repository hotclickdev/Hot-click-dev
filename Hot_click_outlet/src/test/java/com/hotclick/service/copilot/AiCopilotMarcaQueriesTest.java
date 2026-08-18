package com.hotclick.service.copilot;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Perfil de marca en HotClick")
class AiCopilotMarcaQueriesTest {

    @Test
    @DisplayName("Usa nombre comercial y pide foto si falta")
    void formatearConHuecos() {
        String texto = AiCopilotMarcaQueries.formatear(
            Map.of("nombre_comercial", "Taller Sol", "nombre_empresa", "Sol SA",
                "descripcion", "Herramientas en Desamparados", "visibilidad_publica", true),
            Map.of("visibles", 12, "sin_foto", 3, "sin_tags", 1));
        assertThat(texto).contains("Taller Sol");
        assertThat(texto).contains("12");
        assertThat(texto).contains("sin foto");
        assertThat(texto).contains("subí foto");
    }

    @Test
    @DisplayName("Si el marketplace está oculto, esa es la acción")
    void accionMarketplaceOculto() {
        assertThat(AiCopilotMarcaQueries.accionMarca(false, "bio", 0))
            .contains("visibilidad pública");
    }
}
