package com.hotclick.service.whatsapp;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.spy;

class WhatsAppClaudeTextClientTest {

    private static final Map<String, String> CTX = Map.of("nombre", "Ana", "productos", "audífonos");

    @Test
    void usaElTextoDeClaudeLimpio() throws Exception {
        WhatsAppClaudeTextClient c = spy(new WhatsAppClaudeTextClient());
        doReturn("  \"Hola Ana, ¡te extrañamos!\"  ").when(c).llamarClaude(anyString(), any());
        assertThat(c.generarTexto(WaPlantilla.REACTIVACION_NOVEDAD, CTX, 1L)).isEqualTo("Hola Ana, ¡te extrañamos!");
    }

    @Test
    void siClaudeFallaUsaFallbackFijo() throws Exception {
        WhatsAppClaudeTextClient c = spy(new WhatsAppClaudeTextClient());
        doThrow(new IllegalStateException("caído")).when(c).llamarClaude(anyString(), any());
        assertThat(c.generarTexto(WaPlantilla.REACTIVACION_NOVEDAD, CTX, 1L)).contains("Hola Ana").contains("hace tiempo");
    }

    @Test
    void sinClaveUsaFallback() {
        WhatsAppClaudeTextClient c = new WhatsAppClaudeTextClient(); // sin api-key: llamarClaude devuelve null
        assertThat(c.generarTexto(WaPlantilla.CARRITO_CURIOSO, CTX, null)).contains("Hola Ana");
    }
}
