package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.InputStream;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Apple Pay (ONVO): /.well-known/apple-developer-merchantid-domain-association debe responder 200, sin
 * autenticación, sin redirección y con los bytes exactos del archivo publicado (ni el SPA ni Security lo tapan).
 */
@DisplayName("Apple Pay — archivo de asociación de dominio")
class ApplePayDomainAssociationTest extends BaseIntegrationTest {

    private static final String RUTA = "/.well-known/apple-developer-merchantid-domain-association";
    private static final String SHA256_ESPERADO =
        "a85f5d203f355dba6e0e7ecf304ac0cd87849f36ff9c52304877b48e6263c2b8";

    @Test
    @DisplayName("sin token: 200 con los bytes exactos")
    void sirveArchivoExacto() throws Exception {
        byte[] esperado;
        try (InputStream in = new ClassPathResource("static" + RUTA).getInputStream()) {
            esperado = in.readAllBytes();
        }
        assertThat(sha256(esperado)).isEqualTo(SHA256_ESPERADO);

        for (String accept : new String[] {"*/*", "text/html"}) {
            MockHttpServletResponse r = mockMvc.perform(get(RUTA).header("Accept", accept))
                .andReturn().getResponse();
            assertThat(r.getStatus()).as("Accept " + accept).isEqualTo(200);
            assertThat(r.getRedirectedUrl()).isNull();
            assertThat(r.getContentAsByteArray()).isEqualTo(esperado);
            assertThat(r.getContentType()).doesNotContain("html");
        }
    }

    private static String sha256(byte[] b) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b));
    }
}
