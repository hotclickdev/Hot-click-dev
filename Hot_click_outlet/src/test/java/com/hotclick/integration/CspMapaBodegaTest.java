package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/** MAN-2 / MAN-3: mapa de la bodega con OpenStreetMap y «Usar mi ubicación» solo en el propio origen. */
@DisplayName("CSP y Permissions-Policy del mapa de bodega")
class CspMapaBodegaTest extends BaseIntegrationTest {

    private String directiva(String csp, String nombre) {
        for (String d : csp.split(";")) {
            if (d.trim().startsWith(nombre + " ")) return d.trim();
        }
        return "";
    }

    @Test
    @DisplayName("OSM: frame del embed, tiles y Nominatim; nada de Google Maps; geolocalización solo self")
    void mapaOsm() throws Exception {
        MockHttpServletResponse res = mockMvc.perform(get("/api/health")).andReturn().getResponse();
        String csp = res.getHeader("Content-Security-Policy");
        assertThat(directiva(csp, "frame-src")).contains("https://www.openstreetmap.org").doesNotContain("maps.google");
        assertThat(directiva(csp, "img-src")).contains("https://tile.openstreetmap.org");
        assertThat(directiva(csp, "connect-src")).contains("https://nominatim.openstreetmap.org");
        assertThat(directiva(csp, "script-src")).doesNotContain("openstreetmap");
        assertThat(res.getHeader("Permissions-Policy")).contains("geolocation=(self)").contains("camera=()");
    }
}
