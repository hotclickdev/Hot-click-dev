package com.hotclick.service.copilot;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Texto del copilot Claude")
class AiCopilotTextoRespuestaTest {

    @Test
    @DisplayName("Vacío o null se reemplaza; el recorte no inventa")
    void normalizar_vacioYTope() {
        assertThat(AiCopilotTextoRespuesta.normalizar(null, 20))
            .isEqualTo(AiCopilotTextoRespuesta.VACIA);
        assertThat(AiCopilotTextoRespuesta.normalizar("  ", 20))
            .isEqualTo(AiCopilotTextoRespuesta.VACIA);
        assertThat(AiCopilotTextoRespuesta.normalizar("hola", 20)).isEqualTo("hola");
        assertThat(AiCopilotTextoRespuesta.normalizar("abcdefghij", 4)).isEqualTo("abcd");
    }
}
