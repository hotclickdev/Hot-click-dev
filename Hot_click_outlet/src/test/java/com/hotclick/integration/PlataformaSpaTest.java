package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Prod (d328b615): abrir /plataforma o /plataforma/crm directo daba 401 y /admin 200. Las rutas de página del
 * panel de plataforma sirven index.html como /admin; la API sigue autenticada y solo para ADMIN.
 */
@DisplayName("SPA /plataforma: entrada directa sirve index.html; /api sigue protegida")
class PlataformaSpaTest extends BaseIntegrationTest {

    @ParameterizedTest
    @ValueSource(strings = {"/plataforma", "/plataforma/", "/plataforma/crm", "/plataforma/crm/compradores/5",
        "/plataforma/negocios/12/ficha"})
    @DisplayName("Sin sesión, la página carga el SPA (200, index.html)")
    void paginasSirvenIndex(String ruta) throws Exception {
        mockMvc.perform(get(ruta).accept(MediaType.TEXT_HTML))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/plataforma", "/plataforma/crm/compras"})
    @DisplayName("También sin Accept text/html (recarga, prefetch, curl)")
    void sinAcceptHtml(String ruta) throws Exception {
        mockMvc.perform(get(ruta)).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/admin/consola/crm", "/api/admin/crm/compras"})
    @DisplayName("La API del panel sigue exigiendo sesión (401) y rol ADMIN (403)")
    void apiSigueProtegida(String ruta) throws Exception {
        mockMvc.perform(get(ruta).accept(MediaType.TEXT_HTML, MediaType.APPLICATION_JSON)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(ruta).header("Authorization", userToken)).andExpect(status().isForbidden());
    }
}
