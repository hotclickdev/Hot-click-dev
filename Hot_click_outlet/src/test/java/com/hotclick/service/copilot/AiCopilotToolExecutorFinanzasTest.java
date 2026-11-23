package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Defensa en profundidad: aunque el modelo invente la llamada, un no-dueño nunca ejecuta consultar_finanzas. */
@DisplayName("Copilot: ejecutarTool(consultar_finanzas) exige dueño")
class AiCopilotToolExecutorFinanzasTest {

    private final AiCopilotContextBuilder contextBuilder = mock(AiCopilotContextBuilder.class);
    private final AiCopilotToolExecutor executor = new AiCopilotToolExecutor();

    AiCopilotToolExecutorFinanzasTest() {
        ReflectionTestUtils.setField(executor, "contextBuilder", contextBuilder);
    }

    @Test
    @DisplayName("esDueno=false: rechazo y getFinanzasData NUNCA se llama")
    void noDuenoRechazado() throws Exception {
        String r = executor.ejecutarTool(1L, "consultar_finanzas", new ObjectMapper().readTree("{}"), null, false);
        assertThat(r).contains("solo").contains("dueño").doesNotContain("FIN-REALES");
        verify(contextBuilder, never()).getFinanzasData(any(), any());
    }

    @Test
    @DisplayName("esDueno=true: sí consulta las finanzas")
    void duenoConsulta() throws Exception {
        var args = new ObjectMapper().readTree("{}");
        when(contextBuilder.getFinanzasData(1L, args)).thenReturn("FIN-REALES");
        assertThat(executor.ejecutarTool(1L, "consultar_finanzas", args, null, true)).isEqualTo("FIN-REALES");
    }
}
