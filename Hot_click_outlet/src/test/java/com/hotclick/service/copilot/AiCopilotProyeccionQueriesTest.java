package com.hotclick.service.copilot;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Proyección de negocio en colones")
class AiCopilotProyeccionQueriesTest {

    @Test
    @DisplayName("Habla de 30 días en colones y de reponer")
    void formatearIncluyeColonesYReponer() {
        String texto = AiCopilotProyeccionQueries.formatear(
            150_000, 4, 8, 2, 3, List.of("Taladro", "Broca"));
        assertThat(texto).contains("₡");
        assertThat(texto).contains("150");
        assertThat(texto).contains("Si seguís así 30 días");
        assertThat(texto).contains("Taladro");
        assertThat(texto).doesNotContain("ABC");
        assertThat(texto).doesNotContain("ML");
    }
}
