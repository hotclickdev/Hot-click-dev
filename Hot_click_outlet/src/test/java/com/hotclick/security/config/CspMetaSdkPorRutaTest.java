package com.hotclick.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

/** AG-14 H-08: el SDK de Facebook y sus hosts de conexión solo van en la CSP de las rutas del panel. */
@DisplayName("CSP: SDK de Meta solo en el panel")
class CspMetaSdkPorRutaTest {

    private static String csp(String ruta) {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", ruta);
        MockHttpServletResponse res = new MockHttpServletResponse();
        SecurityHeadersWriter.create("https://bucket.example").writeHeaders(req, res);
        return res.getHeader("Content-Security-Policy");
    }

    @Test
    @DisplayName("Panel (/admin, /plataforma): script-src, script-src-elem y connect-src con Meta")
    void panelConMeta() {
        for (String ruta : new String[] {"/admin", "/admin/bot", "/plataforma", "/plataforma/empresas"}) {
            String csp = csp(ruta);
            assertThat(csp).as(ruta).contains("script-src 'self' https://connect.facebook.net")
                .contains("script-src-elem 'self' https://connect.facebook.net")
                .contains("connect-src 'self' https://graph.facebook.com");
        }
    }

    @Test
    @DisplayName("Resto del sitio: sin connect.facebook.net ni hosts de conexión de Meta")
    void restoSinMeta() {
        for (String ruta : new String[] {"/", "/checkout", "/c/ABCDEFGHIJKLMNOPQRSTUVWX", "/productos", "/api/health",
            "/administrador", "/adminx/bot", "/plataformas"}) {
            String csp = csp(ruta);
            assertThat(csp).as(ruta).doesNotContain("connect.facebook.net").doesNotContain("graph.facebook.com");
            assertThat(csp).as(ruta).contains("script-src 'self' https://sdk.onvopay.com");
        }
    }

    @Test
    @DisplayName("URI nula no abre nada")
    void uriNula() {
        assertThat(SecurityHeadersWriter.esRutaDePanel(null)).isFalse();
    }
}
