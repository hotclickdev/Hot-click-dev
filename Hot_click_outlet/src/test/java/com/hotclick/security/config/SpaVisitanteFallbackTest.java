package com.hotclick.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SpaVisitanteFallback — qué cuenta como navegación de visitante")
class SpaVisitanteFallbackTest {

    private static MockHttpServletRequest pedido(String metodo, String ruta, String accept) {
        MockHttpServletRequest r = new MockHttpServletRequest(metodo, ruta);
        if (accept != null) r.addHeader("Accept", accept);
        return r;
    }

    @Test
    @DisplayName("GET HTML a ruta sin extensión fuera de /api y paneles → sí")
    void navegacionHtml() {
        assertThat(SpaVisitanteFallback.esNavegacionVisitante(pedido("GET", "/no-existe", "text/html,application/xhtml+xml"))).isTrue();
        assertThat(SpaVisitanteFallback.esNavegacionVisitante(pedido("HEAD", "/otra/ruta/", "text/html"))).isTrue();
    }

    @Test
    @DisplayName("API, actuator, paneles de rol y POS → nunca")
    void excluidos() {
        for (String ruta : new String[] {"/api/x", "/actuator/env", "/admin/x", "/emprendedor/pos", "/pyme/x",
            "/negocio-plus/x", "/pos/caja", "/caja", "/error", "/api"}) {
            assertThat(SpaVisitanteFallback.esNavegacionVisitante(pedido("GET", ruta, "text/html"))).as(ruta).isFalse();
        }
    }

    @Test
    @DisplayName("sin Accept text/html, con extensión de archivo, o método distinto de GET/HEAD → no")
    void noNavegacion() {
        assertThat(SpaVisitanteFallback.esNavegacionVisitante(pedido("GET", "/no-existe", "application/json"))).isFalse();
        assertThat(SpaVisitanteFallback.esNavegacionVisitante(pedido("GET", "/no-existe", null))).isFalse();
        assertThat(SpaVisitanteFallback.esNavegacionVisitante(pedido("GET", "/assets/app.js", "text/html"))).isFalse();
        assertThat(SpaVisitanteFallback.esNavegacionVisitante(pedido("POST", "/no-existe", "text/html"))).isFalse();
        assertThat(SpaVisitanteFallback.esNavegacionVisitante(pedido("GET", "/", "text/html"))).isFalse();
    }
}
