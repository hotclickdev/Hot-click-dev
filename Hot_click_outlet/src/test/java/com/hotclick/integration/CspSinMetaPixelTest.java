package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/** Meta Pixel apagado (sin publicidad): la CSP no permite sus hosts; solo el iframe de videos de Facebook. */
@DisplayName("CSP sin hosts de Meta Pixel")
class CspSinMetaPixelTest extends BaseIntegrationTest {

    @Test
    @DisplayName("Ni connect.facebook.net ni facebook.com fuera de frame-src")
    void cspSinMeta() throws Exception {
        String csp = mockMvc.perform(get("/api/health")).andReturn().getResponse().getHeader("Content-Security-Policy");
        assertThat(csp).isNotNull().doesNotContain("connect.facebook.net").doesNotContain("graph.facebook.com")
            .doesNotContain("*.facebook.com");
        for (String directiva : csp.split(";")) {
            if (!directiva.trim().startsWith("frame-src")) {
                assertThat(directiva).as(directiva.trim()).doesNotContain("facebook");
            }
        }
    }
}
