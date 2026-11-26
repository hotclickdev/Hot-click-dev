package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Meta Pixel apagado (sin publicidad): la CSP no permite el píxel. El SDK del login de Meta (AG-23/AG-30) solo se
 * permite en las rutas del panel (AG-14 H-08), no en el resto del sitio.
 */
@DisplayName("CSP sin hosts de Meta Pixel")
class CspSinMetaPixelTest extends BaseIntegrationTest {

    private String csp(String ruta) throws Exception {
        return mockMvc.perform(get(ruta)).andReturn().getResponse().getHeader("Content-Security-Policy");
    }

    @Test
    @DisplayName("Meta solo en script (SDK del login), connect y frame; nunca el píxel ni imágenes")
    void cspSinMeta() throws Exception {
        String csp = csp("/admin/bot");
        assertThat(csp).isNotNull().doesNotContain("*.facebook.com").doesNotContain("facebook.com/tr");
        for (String directiva : csp.split(";")) {
            String d = directiva.trim();
            boolean permitida = d.startsWith("frame-src") || d.startsWith("script-src") || d.startsWith("connect-src");
            if (!permitida) assertThat(d).as(d).doesNotContain("facebook");
        }
    }

    @Test
    @DisplayName("H-08: el SDK de Facebook está en el panel y no en el resto del sitio")
    void sdkSoloEnElPanel() throws Exception {
        assertThat(csp("/admin/bot")).contains("https://connect.facebook.net");
        assertThat(csp("/plataforma")).contains("https://connect.facebook.net");
        assertThat(csp("/api/health")).doesNotContain("connect.facebook.net");
        assertThat(csp("/checkout")).doesNotContain("connect.facebook.net");
        assertThat(csp("/c/ABCDEFGHIJKLMNOPQRSTUVWX")).doesNotContain("connect.facebook.net");
    }
}
