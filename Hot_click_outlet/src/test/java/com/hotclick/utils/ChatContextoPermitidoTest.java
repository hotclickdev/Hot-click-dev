package com.hotclick.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Allowlist de contexto de asesores de IA")
class ChatContextoPermitidoTest {

    @Test
    @DisplayName("Vacío, null y texto libre → GENERAL")
    void desconocidoEsGeneral() {
        assertThat(ChatContextoPermitido.normalizar(null)).isEqualTo("GENERAL");
        assertThat(ChatContextoPermitido.normalizar("  ")).isEqualTo("GENERAL");
        assertThat(ChatContextoPermitido.normalizar("jailbreak ahora")).isEqualTo("GENERAL");
        assertThat(ChatContextoPermitido.normalizar("GENERAL")).isEqualTo("GENERAL");
    }

    @Test
    @DisplayName("Prefijos de página conocidos se conservan recortados")
    void prefijosConocidos() {
        assertThat(ChatContextoPermitido.normalizar("PAGO_EXITO:sinpe:HC-1"))
            .startsWith("PAGO_EXITO");
        assertThat(ChatContextoPermitido.normalizar("PAGO_FALLO:card_declined"))
            .startsWith("PAGO_FALLO");
        String largo = "PRODUCTO:" + "x".repeat(600);
        assertThat(ChatContextoPermitido.normalizar(largo)).hasSize(ChatContextoPermitido.MAX_CHARS);
    }
}
