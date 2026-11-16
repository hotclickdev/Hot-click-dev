package com.hotclick.service.email;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("EmailLayoutHelper — logo y pie salen de app.url (riesgos 15-nov)")
class EmailLayoutHelperAppUrlTest {

    private static final String OTRA = "https://staging.ejemplo.test";

    private EmailLayoutHelper layout(String appUrl) {
        EmailLayoutHelper l = new EmailLayoutHelper();
        ReflectionTestUtils.setField(l, "appUrl", appUrl);
        return l;
    }

    @Test
    @DisplayName("el logo apunta a app.url, no a hotclick.lat")
    void logoUsaAppUrl() {
        String html = layout(OTRA + "/").wordmark(false);
        assertThat(html).contains("src=\"" + OTRA + "/brand/hotclick-isotipo.png\"")
            .doesNotContain("hotclick.lat");
    }

    @Test
    @DisplayName("el enlace del pie apunta a app.url, no a hotclick.lat")
    void pieUsaAppUrl() {
        String html = layout(OTRA).footer("¿Dudas?");
        assertThat(html).contains("<a href=\"" + OTRA + "\"")
            .doesNotContain("href=\"https://hotclick.lat\"");
    }

    @Test
    @DisplayName("el encabezado completo (abrirHtml) usa app.url en el logo")
    void abrirHtmlUsaAppUrl() {
        assertThat(layout(OTRA).abrirHtml()).contains(OTRA + "/brand/hotclick-isotipo.png");
    }

    @Test
    @DisplayName("app.url vacío cae al default hotclick.lat")
    void vacioCaeAlDefault() {
        EmailLayoutHelper l = layout(" ");
        assertThat(l.wordmark(true)).contains("https://hotclick.lat/brand/hotclick-isotipo.png");
        assertThat(l.footer("x")).contains("<a href=\"https://hotclick.lat\"");
    }

    @Test
    @DisplayName("el texto visible del pie sigue siendo hotclick.lat")
    void textoVisibleDelPie() {
        assertThat(layout(OTRA).footer("x")).contains(">hotclick.lat</a>");
    }
}
