package com.hotclick.controller;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class CustomErrorControllerTest {

    private final CustomErrorController controller = new CustomErrorController();

    private static MockHttpServletRequest error(int status, String uri) {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/error");
        req.setAttribute("jakarta.servlet.error.status_code", status);
        req.setAttribute("jakarta.servlet.error.request_uri", uri);
        return req;
    }

    @Test
    void visitante404UsaElDisenoClaroDeFigma() {
        String html = controller.handleError(error(404, "/no-existe"));
        assertThat(html).contains("Esta página no existe", "Ir al inicio", "#E73B33");
        assertThat(html).doesNotContain("#09090b", "🔍");
    }

    @Test
    void visitante500OfreceReintentarYWhatsapp() {
        String html = controller.handleError(error(500, "/productos/12"));
        assertThat(html).contains("Algo salió mal de nuestro lado", "Reintentar", "wa.me/50686667888");
    }

    @Test
    void panelesYRolesConservanLaPaginaOscura() {
        for (String uri : new String[] {"/admin/pedidos", "/emprendedor", "/pos", "/pyme/inicio", "/negocio-plus-plan"}) {
            String html = controller.handleError(error(404, uri));
            assertThat(html).as(uri).contains("#09090b", "Página no encontrada (404)");
        }
    }

    @Test
    void sinUriSeTrataComoVisitante() {
        assertThat(CustomErrorController.esRutaVisitante(null)).isTrue();
        assertThat(CustomErrorController.esRutaVisitante("/tienda/casa-luna-506")).isTrue();
        assertThat(CustomErrorController.esRutaVisitante("/para-emprendedores")).isFalse();
    }
}
