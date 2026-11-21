package com.hotclick.controller;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class LandingParaNegociosControllerTest {

    private static String plantillaReal() throws Exception {
        return new String(new ClassPathResource("landing/para-negocios.html").getInputStream().readAllBytes(),
            StandardCharsets.UTF_8);
    }

    private static LandingParaNegociosController controller(String telefono) throws Exception {
        LandingParaNegociosController c = new LandingParaNegociosController();
        ReflectionTestUtils.setField(c, "plantilla", new ClassPathResource("landing/para-negocios.html"));
        ReflectionTestUtils.setField(c, "telefonoSoporte", telefono);
        c.cargar();
        return c;
    }

    @Test
    void plantillaNoTraeTelefonoNiScriptsEnLineaNiCdn() throws Exception {
        String p = plantillaReal();
        assertThat(p).contains(LandingParaNegociosController.MARCA_WA, LandingParaNegociosController.MARCA_TEXTO);
        assertThat(p).doesNotContain("<script>", "cdn.jsdelivr.net", "wa.me/506");
        assertThat(p).containsPattern("src=\"/para-negocios/landing\\.js\"");
    }

    @Test
    void conTelefono_llenaWhatsappYTextoVisible() throws Exception {
        String html = controller("0000-0000").pagina().getBody();
        assertThat(html).contains("https://wa.me/50600000000?text=", "<b>0000-0000</b>");
        assertThat(html).doesNotContain(LandingParaNegociosController.MARCA_WA, LandingParaNegociosController.MARCA_TEXTO);
    }

    @Test
    void sinTelefono_losBotonesVanAContactoYSeOmiteElNumero() throws Exception {
        String html = controller("").pagina().getBody();
        assertThat(html).doesNotContain("wa.me", LandingParaNegociosController.MARCA_WA, LandingParaNegociosController.MARCA_TEXTO);
        assertThat(html).contains("href=\"/contacto\"");
    }

    @Test
    void textoVisibleNoAceptaHtml() {
        String html = LandingParaNegociosController.render("<b>__SOPORTE_TEXTO__</b> · x", "<script>8888-8888");
        assertThat(html).doesNotContain("<script>").contains("8888-8888");
    }

    @Test
    void precios_igualesALaConfiguracionDePlanes() throws Exception {
        String p = plantillaReal().split("var ES=")[0];
        assertThat(p).contains("<td>9 %</td><td>7,5 %</td><td>6 %</td>");
        assertThat(p).doesNotContain("₡700", "mínimo");
    }

    @Test
    void conBarraFinal_redirigeALaRutaCanonica() throws Exception {
        var r = controller("").conBarra();
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.MOVED_PERMANENTLY);
        assertThat(r.getHeaders().getFirst(HttpHeaders.LOCATION)).isEqualTo("/para-negocios");
    }
}
