package com.hotclick.service.publicchat;

import com.hotclick.service.contacto.ContactoPublicoPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("[NEGOCIO] Chat público: WhatsApp del vendedor solo con plan PYME o NEGOCIO_PLUS")
class PublicChatContactoTest {

    @ParameterizedTest(name = "plan {0} → {1}")
    @CsvSource({
        "EMPRENDEDOR, 50686667888",
        "GRATUITO, 50686667888",
        "PYME, 50688880506",
        "NEGOCIO_PLUS, 50688880506",
    })
    void numeroSegunPlan(String plan, String esperado) {
        assertThat(PublicChatClaudeClient.whatsappVisible("50688880506", plan)).isEqualTo(esperado);
    }

    @Test
    @DisplayName("Sin plan o sin número: el de HotClick")
    void sinPlanOSinNumero_hotclick() {
        assertThat(PublicChatClaudeClient.whatsappVisible("50688880506", null)).isEqualTo(ContactoPublicoPolicy.WHATSAPP_HOTCLICK);
        assertThat(PublicChatClaudeClient.whatsappVisible(" ", "PYME")).isEqualTo(ContactoPublicoPolicy.WHATSAPP_HOTCLICK);
        assertThat(PublicChatClaudeClient.whatsappVisible(null, "PYME")).isEqualTo(ContactoPublicoPolicy.WHATSAPP_HOTCLICK);
    }

    @ParameterizedTest(name = "prompt con plan {0} contiene vendedor={1}")
    @CsvSource({"EMPRENDEDOR, false", "PYME, true", "NEGOCIO_PLUS, true"})
    void infoDelPromptSegunPlan(String plan, boolean conVendedor) {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        Map<String, Object> fila = new HashMap<>();
        fila.put("wa", "50688880506");
        fila.put("nombre", "Casa Luna 506");
        fila.put("plan", plan);
        when(jdbc.queryForMap(anyString(), eq(9L))).thenReturn(fila);
        PublicChatClaudeClient cliente = new PublicChatClaudeClient(jdbc, new PublicChatPromptBuilder(), null, null);

        String texto = cliente.whatsappContactText(9L, false);

        assertThat(cliente.getEmpresaChatInfo(9L).nombre()).isEqualTo("Casa Luna 506");
        assertThat(texto.contains("50688880506")).isEqualTo(conVendedor);
        assertThat(texto.contains("50686667888")).isEqualTo(!conVendedor);
    }
}
