package com.hotclick.service.publicchat;

import com.hotclick.service.contacto.ContactoPublicoPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("[NEGOCIO] Chat público: WhatsApp del vendedor solo con plan PYME o NEGOCIO_PLUS")
class PublicChatContactoTest {

    /** Valores ficticios: nunca un número real en tests. */
    private static final String SOPORTE_FAKE = "+000 0000 0000";
    private static final String HOTCLICK_WA = "00000000000";
    private static final String VENDEDOR_WA = "88888888";

    @ParameterizedTest(name = "plan {0} → {1}")
    @CsvSource({
        "EMPRENDEDOR, 00000000000",
        "GRATUITO, 00000000000",
        "PYME, 88888888",
        "NEGOCIO_PLUS, 88888888",
    })
    void numeroSegunPlan(String plan, String esperado) {
        assertThat(PublicChatClaudeClient.whatsappVisible(VENDEDOR_WA, plan, HOTCLICK_WA)).isEqualTo(esperado);
    }

    @Test
    @DisplayName("Sin plan o sin número: el de HotClick (configurado)")
    void sinPlanOSinNumero_hotclick() {
        String hc = ContactoPublicoPolicy.whatsappHotclick(SOPORTE_FAKE);
        assertThat(hc).isEqualTo(HOTCLICK_WA);
        assertThat(PublicChatClaudeClient.whatsappVisible(VENDEDOR_WA, null, hc)).isEqualTo(HOTCLICK_WA);
        assertThat(PublicChatClaudeClient.whatsappVisible(" ", "PYME", hc)).isEqualTo(HOTCLICK_WA);
        assertThat(PublicChatClaudeClient.whatsappVisible(null, "PYME", hc)).isEqualTo(HOTCLICK_WA);
    }

    @Test
    @DisplayName("Soporte vacío: sin número de HotClick y sin romper")
    void soporteVacio_sinNumero() {
        assertThat(ContactoPublicoPolicy.whatsappHotclick("")).isEmpty();
        assertThat(ContactoPublicoPolicy.whatsappHotclick(null)).isEmpty();
        assertThat(PublicChatClaudeClient.whatsappVisible(VENDEDOR_WA, "EMPRENDEDOR", "")).isEmpty();
        assertThat(PublicChatClaudeClient.whatsappVisible(VENDEDOR_WA, "PYME", "")).isEqualTo(VENDEDOR_WA);
    }

    private static PublicChatClaudeClient cliente(String plan, String soporte) {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        Map<String, Object> fila = new HashMap<>();
        fila.put("wa", VENDEDOR_WA);
        fila.put("nombre", "Casa Luna 506");
        fila.put("plan", plan);
        when(jdbc.queryForMap(anyString(), eq(9L))).thenReturn(fila);
        PublicChatClaudeClient c = new PublicChatClaudeClient(jdbc, new PublicChatPromptBuilder(), null, null);
        ReflectionTestUtils.setField(c, "telefonoSoporte", soporte);
        return c;
    }

    @ParameterizedTest(name = "prompt con plan {0} contiene vendedor={1}")
    @CsvSource({"EMPRENDEDOR, false", "PYME, true", "NEGOCIO_PLUS, true"})
    void infoDelPromptSegunPlan(String plan, boolean conVendedor) {
        PublicChatClaudeClient c = cliente(plan, SOPORTE_FAKE);
        String texto = c.whatsappContactText(9L, false);

        assertThat(c.getEmpresaChatInfo(9L).nombre()).isEqualTo("Casa Luna 506");
        assertThat(texto.contains(VENDEDOR_WA)).isEqualTo(conVendedor);
        assertThat(texto.contains(HOTCLICK_WA)).isEqualTo(!conVendedor);
    }

    @Test
    @DisplayName("Soporte vacío + plan sin contacto: el texto no trae wa.me ni número")
    void soporteVacio_textoSinWhatsapp() {
        PublicChatClaudeClient c = cliente("EMPRENDEDOR", "");
        String texto = c.whatsappContactText(9L, false);
        assertThat(texto).doesNotContain("wa.me").doesNotContain(VENDEDOR_WA).contains("Contacto");
        assertThat(c.businessInfoText(9L, false, false)).doesNotContain("wa.me");
    }

    @Test
    @DisplayName("Falla de BD con soporte vacío: fallback sin número")
    void falloBd_soporteVacio() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForMap(anyString(), eq(9L))).thenThrow(new RuntimeException("db"));
        PublicChatClaudeClient c = new PublicChatClaudeClient(jdbc, new PublicChatPromptBuilder(), null, null);
        ReflectionTestUtils.setField(c, "telefonoSoporte", "");
        assertThat(c.getEmpresaChatInfo(9L).whatsapp()).isEmpty();
        ReflectionTestUtils.setField(c, "telefonoSoporte", SOPORTE_FAKE);
        assertThat(c.getEmpresaChatInfo(9L).whatsapp()).isEqualTo(HOTCLICK_WA);
    }

    @Test
    @DisplayName("El SQL no trae número literal de respaldo")
    void sqlSinLiteral() throws Exception {
        String src = java.nio.file.Files.readString(java.nio.file.Path.of(
            "src/main/java/com/hotclick/service/publicchat/PublicChatClaudeClient.java"));
        assertThat(src).doesNotContainPattern("'\\d{8,}'");
        String pol = java.nio.file.Files.readString(java.nio.file.Path.of(
            "src/main/java/com/hotclick/service/contacto/ContactoPublicoPolicy.java"));
        assertThat(pol).doesNotContainPattern("\"\\d{8,}\"");
    }
}
