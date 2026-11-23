package com.hotclick.controller.spa;

import com.hotclick.repository.TestimonioRepository;
import com.hotclick.service.contacto.ContactoTextoPublico;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("SpaSeoSupport: robots nulo no lanza NPE")
class SpaSeoRobotsNuloTest {

    @Test
    @DisplayName("injectPagina con robots null genera el bloque sin hreflang")
    void robotsNuloNoLanza() {
        SpaSeoSupport seo = new SpaSeoSupport(mock(TestimonioRepository.class), mock(ContactoTextoPublico.class));
        ReflectionTestUtils.setField(seo, "appUrl", "https://hotclick.lat");
        String html = "<!-- HC_SEO_BLOCK_START --><!-- HC_SEO_BLOCK_END -->";

        String out = ReflectionTestUtils.invokeMethod(seo, "injectPagina",
            html, "Titulo", "Desc", "/x", null, null);

        assertThat(out).contains("<title>Titulo</title>").doesNotContain("hreflang");
    }
}
