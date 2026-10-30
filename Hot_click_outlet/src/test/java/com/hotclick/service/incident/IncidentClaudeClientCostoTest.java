package com.hotclick.service.incident;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

@DisplayName("IncidentClaudeClient — costo con la tarifa del modelo usado")
class IncidentClaudeClientCostoTest {

    private final ObjectMapper om = new ObjectMapper();
    private final com.hotclick.service.AiQuotaService quota = org.mockito.Mockito.mock(com.hotclick.service.AiQuotaService.class);
    private final com.hotclick.service.ai.ClaudeUsoRegistrador registrador = new com.hotclick.service.ai.ClaudeUsoRegistrador(quota);

    private double costo(String modelo) throws Exception {
        IncidentClaudeClient c = new IncidentClaudeClient(om, registrador);
        ReflectionTestUtils.setField(c, "model", modelo);
        return c.registrarCosto(om.readTree("{\"input_tokens\":1000000,\"output_tokens\":1000000}"));
    }

    @Test
    @DisplayName("Sonnet 4.6 (modelo por defecto del cliente) se valoriza a 3 + 15 = US$18 por 1M/1M")
    void sonnetUsaSuTarifa() throws Exception {
        assertThat(costo("claude-sonnet-4-6")).isCloseTo(18.00, offset(1e-9));
    }

    @Test
    @DisplayName("Si anthropic.model es Haiku 4.5 usa la tarifa principal (US$6)")
    void haikuUsaTarifaPrincipal() throws Exception {
        assertThat(costo("claude-haiku-4-5-20251001")).isCloseTo(6.00, offset(1e-9));
    }

    @Test
    @DisplayName("Sin usage no registra costo")
    void sinUsage() throws Exception {
        IncidentClaudeClient c = new IncidentClaudeClient(om, registrador);
        ReflectionTestUtils.setField(c, "model", "claude-sonnet-4-6");
        assertThat(c.registrarCosto(om.missingNode())).isZero();
    }

    @Test
    @DisplayName("Registra en ai_uso los cuatro tipos de tokens a nombre de la plataforma")
    void registraEnAiUso() throws Exception {
        IncidentClaudeClient c = new IncidentClaudeClient(om, registrador);
        ReflectionTestUtils.setField(c, "model", "claude-sonnet-4-6");
        c.registrarCosto(om.readTree("{\"input_tokens\":120,\"output_tokens\":45,"
            + "\"cache_read_input_tokens\":300,\"cache_creation_input_tokens\":80}"));
        org.mockito.ArgumentCaptor<com.hotclick.service.ai.UsoTokens> uso =
            org.mockito.ArgumentCaptor.forClass(com.hotclick.service.ai.UsoTokens.class);
        org.mockito.Mockito.verify(quota).actualizarTokens(
            org.mockito.ArgumentMatchers.eq(com.hotclick.utils.Constants.EMPRESA_PLATAFORMA_ID), uso.capture());
        assertThat(uso.getValue().entrada()).isEqualTo(120);
        assertThat(uso.getValue().salida()).isEqualTo(45);
        assertThat(uso.getValue().cacheLectura()).isEqualTo(300);
        assertThat(uso.getValue().cacheEscritura()).isEqualTo(80);
    }

    @Test
    @DisplayName("Si ai_uso falla, la llamada de incidentes no se cae")
    void falloDeAiUsoNoPropaga() throws Exception {
        org.mockito.Mockito.doThrow(new RuntimeException("db caida")).when(quota)
            .actualizarTokens(org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.any(com.hotclick.service.ai.UsoTokens.class));
        assertThat(costo("claude-sonnet-4-6")).isCloseTo(18.00, offset(1e-9));
    }

    @Test
    @DisplayName("Sin usage no escribe en ai_uso")
    void sinUsageNoEscribe() throws Exception {
        IncidentClaudeClient c = new IncidentClaudeClient(om, registrador);
        ReflectionTestUtils.setField(c, "model", "claude-sonnet-4-6");
        c.registrarCosto(om.missingNode());
        org.mockito.Mockito.verifyNoInteractions(quota);
    }
}
