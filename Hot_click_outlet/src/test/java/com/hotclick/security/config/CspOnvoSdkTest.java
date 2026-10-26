package com.hotclick.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

/** Regresión: la CSP debe permitir el SDK embebido de ONVO (script + iframe), sin abrir más de lo necesario. */
@DisplayName("CSP permite el SDK de ONVO")
class CspOnvoSdkTest {

    private static String directiva(String csp, String nombre) {
        for (String d : csp.split(";")) {
            if (d.trim().startsWith(nombre + " ")) return d.trim();
        }
        return "";
    }

    private static String csp() {
        MockHttpServletResponse res = new MockHttpServletResponse();
        SecurityHeadersWriter.create("https://bucket.example").writeHeaders(new MockHttpServletRequest(), res);
        return res.getHeader("Content-Security-Policy");
    }

    @Test
    @DisplayName("script-src, script-src-elem y frame-src incluyen https://sdk.onvopay.com")
    void sdkPermitido() {
        String csp = csp();
        assertThat(directiva(csp, "script-src").split(" ")).contains("https://sdk.onvopay.com");
        assertThat(directiva(csp, "script-src-elem").split(" ")).contains("https://sdk.onvopay.com");
        assertThat(directiva(csp, "frame-src").split(" ")).contains("https://sdk.onvopay.com");
    }

    @Test
    @DisplayName("Mínimo privilegio: sin comodín de onvopay ni unsafe-inline/eval en scripts")
    void minimo() {
        String csp = csp();
        assertThat(csp).doesNotContain("*.onvopay.com");
        assertThat(directiva(csp, "script-src")).doesNotContain("unsafe-inline").doesNotContain("unsafe-eval");
        assertThat(directiva(csp, "connect-src")).doesNotContain("onvopay");
        assertThat(directiva(csp, "frame-ancestors")).isEqualTo("frame-ancestors 'self'");
    }
}
