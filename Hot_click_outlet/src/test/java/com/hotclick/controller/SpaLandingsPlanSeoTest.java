package com.hotclick.controller;

import com.hotclick.service.contacto.ContactoTextoPublico;
import com.hotclick.controller.spa.SpaSeoSupport;
import com.hotclick.repository.TestimonioRepository;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("Las landings de planes sirven title y canonical de su ruta, no los de la home")
class SpaLandingsPlanSeoTest {

    private static final String INDEX = """
        <html><head>
        <!-- HC_SEO_BLOCK_START -->
        <title>HOTCLICK — Tienda en línea para comprar en Costa Rica</title>
        <link rel="canonical" href="https://hotclick.lat/" />
        <!-- HC_SEO_BLOCK_END -->
        </head><body></body></html>
        """;

    private SpaController controller;

    @BeforeEach
    void setUp() {
        SpaSeoSupport seo = new SpaSeoSupport(mock(TestimonioRepository.class), mock(ContactoTextoPublico.class));
        ReflectionTestUtils.setField(seo, "appUrl", "https://hotclick.lat");
        controller = new SpaController();
        ReflectionTestUtils.setField(controller, "spaSeoSupport", seo);
        ReflectionTestUtils.setField(controller, "indexHtmlContent", INDEX);
        ReflectionTestUtils.setField(controller, "preciosPlanes", new PreciosPlanesConfig("9", "24", "49", "usd"));
        ReflectionTestUtils.setField(controller, "trialEmprendedor", new TrialEmprendedorConfig(70, 90));
    }

    private static void assertLanding(ResponseEntity<String> r, String titulo, String canonical) {
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getHeaders().getFirst("Content-Language")).isEqualTo("es-CR");
        String body = r.getBody();
        assertThat(body).contains("<title>" + titulo);
        assertThat(body).contains("<link rel=\"canonical\" href=\"https://hotclick.lat" + canonical + "\" />");
        assertThat(body).contains("<meta property=\"og:url\" content=\"https://hotclick.lat" + canonical + "\" />");
        assertThat(body).doesNotContain("Tienda en línea para comprar en Costa Rica");
        assertThat(body).doesNotContain("href=\"https://hotclick.lat/\"");
    }

    @Test
    void emprende() {
        ResponseEntity<String> r = controller.emprendePage();
        assertLanding(r, "Plan Emprendedor", "/emprende");
        assertThat(r.getBody()).contains("3 meses sin mensualidad para los primeros 70 negocios")
            .contains("US$9/mes + 9% por venta");
    }

    @Test
    void pyme() {
        ResponseEntity<String> r = controller.pymePage();
        assertLanding(r, "PYME", "/para-pymes");
        assertThat(r.getBody()).contains("US$24/mes + 7,5% por venta");
    }

    @Test
    void negocioPlus() {
        ResponseEntity<String> r = controller.negocioPlusPage();
        assertLanding(r, "Negocio Plus", "/negocio-plus-plan");
        assertThat(r.getBody()).contains("US$49/mes + 6% por venta");
    }

    @Test
    void planes() {
        assertLanding(controller.planesPage(), "Planes para vender en HotClick", "/planes");
    }

    @Test
    void sinPrecioConfiguradoNoInventaMonto() {
        ReflectionTestUtils.setField(controller, "preciosPlanes", new PreciosPlanesConfig("", "", "", "usd"));
        assertThat(controller.pymePage().getBody()).contains("mensualidad en dólares + 7,5% por venta").doesNotContain("US$");
    }

    @Test
    void paraEmprendedoresRedirigeConUn301AEmprende() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        ResponseEntity<Void> r = controller.paraEmprendedoresAlias(request);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.MOVED_PERMANENTLY);
        assertThat(r.getHeaders().getFirst("Location")).isEqualTo("/emprende");

        request.setQueryString("utm_source=ig");
        assertThat(controller.paraEmprendedoresAlias((HttpServletRequest) request).getHeaders().getFirst("Location"))
            .isEqualTo("/emprende?utm_source=ig");
    }

    @Test
    void paraEmprendedoresMapeaConYSinBarraFinal() throws Exception {
        var m = SpaController.class.getMethod("paraEmprendedoresAlias", HttpServletRequest.class);
        var rutas = m.getAnnotation(org.springframework.web.bind.annotation.GetMapping.class).value();
        assertThat(rutas).containsExactlyInAnyOrder("/para-emprendedores", "/para-emprendedores/");
    }
}
