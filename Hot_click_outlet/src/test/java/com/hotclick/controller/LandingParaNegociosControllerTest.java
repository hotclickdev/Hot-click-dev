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
        String p = plantillaReal();
        assertThat(p).contains("<td>9 %</td><td>7,5 %</td><td>6 %</td>");
        assertThat(p).doesNotContain("₡700", "mínimo");
    }

    @Test
    void mensualidad_enDolares_yNoEnColonesViejos() throws Exception {
        java.nio.file.Path jsPath = java.nio.file.Path.of("frontend/public/para-negocios/landing.js");
        if (!java.nio.file.Files.exists(jsPath)) {
            jsPath = java.nio.file.Path.of("Hot_click_outlet/frontend/public/para-negocios/landing.js");
        }
        String js = java.nio.file.Files.readString(jsPath);
        for (String texto : new String[] {plantillaReal(), js}) {
            assertThat(texto).doesNotContain("₡12.900", "₡12,900", "₡28.900", "₡28,900", "₡0 al mes", "₡0 per month",
                "₡0 por mês", "₡0 a month", "<b>₡0</b>", "<td>₡0</td>");
        }
        assertThat(plantillaReal()).contains("<td>US$9</td><td>US$24</td><td>US$49</td>", "90 días gratis", "primeros 70 negocios");
    }

    @Test
    void calendario_soloPaginasDeReservasDeGoogle() {
        String id = "AcZssZ0abcdefGHIJ_klm-123";
        String esperado = "https://calendar.google.com/calendar/appointments/schedules/" + id + "?gv=true";
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://calendar.google.com/appointments/schedules/" + id)).isEqualTo(esperado);
        assertThat(LandingParaNegociosController.calendarioEmbebible(" " + esperado + " ")).isEqualTo(esperado);
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://evil.example/appointments/schedules/" + id)).isEmpty();
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://calendar.google.com/calendar/appointments/schedules/x\"onload=\"y")).isEmpty();
        assertThat(LandingParaNegociosController.calendarioEmbebible("")).isEmpty();
        assertThat(LandingParaNegociosController.calendarioEmbebible(null)).isEmpty();
    }

    @Test
    void calendario_seInsertaEnDataGcal() throws Exception {
        String id = "AcZssZ0abcdefGHIJ_klm-123";
        String html = LandingParaNegociosController.render(plantillaReal(), "", "https://calendar.google.com/appointments/schedules/" + id);
        assertThat(html).contains("data-cal=\"https://calendar.google.com/calendar/appointments/schedules/" + id + "?gv=true\"")
            .doesNotContain(LandingParaNegociosController.MARCA_CALENDARIO);
        assertThat(LandingParaNegociosController.render(plantillaReal(), "", "")).contains("data-cal=\"\"");
        assertThat(LandingParaNegociosController.render(plantillaReal(), "", "https://cal.com/hotclick/demo"))
            .contains("data-cal=\"https://cal.com/hotclick/demo?layout=month_view\"");
    }

    @Test
    void calendario_calCom_seReconstruyeSinCopiarLaEntrada() {
        String esperado = "https://cal.com/hotclick/demo-30?layout=month_view";
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://cal.com/hotclick/demo-30")).isEqualTo(esperado);
        assertThat(LandingParaNegociosController.calendarioEmbebible(" https://cal.com/hotclick/demo-30/ ")).isEqualTo(esperado);
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://app.cal.com/hotclick/demo-30?month=2026-12")).isEqualTo(esperado);
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://cal.com/andres.z/demo")).isEqualTo("https://cal.com/andres.z/demo?layout=month_view");
    }

    @Test
    void calendario_calCom_rechazaOtrosDominiosYAtaques() {
        assertThat(LandingParaNegociosController.calendarioEmbebible("http://cal.com/hotclick/demo")).isEmpty();
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://cal.com.evil.example/hotclick/demo")).isEmpty();
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://evilcal.com/hotclick/demo")).isEmpty();
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://cal.com/hotclick")).isEmpty();
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://cal.com/../demo")).isEmpty();
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://cal.com/hotclick/demo\"onload=\"x")).isEmpty();
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://cal.com/hotclick/demo?x=\"><script>")).isEmpty();
        assertThat(LandingParaNegociosController.calendarioEmbebible("https://cal.com/hotclick/demo/extra")).isEmpty();
    }

    @Test
    void idiomas_soloLosDelSitio() throws Exception {
        String p = plantillaReal();
        assertThat(p).contains("<option value=\"es\">", "<option value=\"en\">", "<option value=\"pt\">");
        assertThat(p).doesNotContain("<option value=\"fr\">", "<option value=\"de\">", "<option value=\"zh\">");
    }

    @Test
    void conBarraFinal_redirigeALaRutaCanonica() throws Exception {
        var r = controller("").conBarra();
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.MOVED_PERMANENTLY);
        assertThat(r.getHeaders().getFirst(HttpHeaders.LOCATION)).isEqualTo("/para-negocios");
    }
}
