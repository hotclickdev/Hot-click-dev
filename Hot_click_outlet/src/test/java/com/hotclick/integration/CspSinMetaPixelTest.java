package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/** Meta Pixel apagado (sin publicidad): la CSP no permite el píxel; el SDK del login de Meta (AG-23/AG-30) sí. */
@DisplayName("CSP sin hosts de Meta Pixel")
class CspSinMetaPixelTest extends BaseIntegrationTest {

    @Test
    @DisplayName("Meta solo en script (SDK del login), connect y frame; nunca el píxel ni imágenes")
    void cspSinMeta() throws Exception {
        String csp = mockMvc.perform(get("/api/health")).andReturn().getResponse().getHeader("Content-Security-Policy");
        assertThat(csp).isNotNull().doesNotContain("*.facebook.com").doesNotContain("facebook.com/tr");
        for (String directiva : csp.split(";")) {
            String d = directiva.trim();
            boolean permitida = d.startsWith("frame-src") || d.startsWith("script-src") || d.startsWith("connect-src");
            if (!permitida) assertThat(d).as(d).doesNotContain("facebook");
        }
    }
}
