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

    private double costo(String modelo) throws Exception {
        IncidentClaudeClient c = new IncidentClaudeClient(om);
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
        IncidentClaudeClient c = new IncidentClaudeClient(om);
        ReflectionTestUtils.setField(c, "model", "claude-sonnet-4-6");
        assertThat(c.registrarCosto(om.missingNode())).isZero();
    }
}
