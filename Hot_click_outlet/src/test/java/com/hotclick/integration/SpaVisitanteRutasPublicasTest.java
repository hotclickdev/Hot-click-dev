package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Rutas públicas de visitante y fallback SPA (aprobado 2-oct-2026, solo visitante).
 * Golpea el filtro de seguridad real: las páginas de visitante responden el SPA sin sesión,
 * una ruta inexistente da 404 con el SPA, y /api, /actuator y las rutas de rol siguen pidiendo auth.
 */
@DisplayName("Visitante — rutas públicas y fallback SPA (filtro real)")
class SpaVisitanteRutasPublicasTest extends BaseIntegrationTest {

    @ParameterizedTest(name = "{0} sin sesión → 200 SPA")
    @ValueSource(strings = {
        "/privacidad", "/terminos", "/cookies", "/envios", "/devoluciones", "/acuerdo-vendedores",
        "/encargo/tok123", "/cotizacion/tok123", "/sin-conexion",
    })
    void paginaDeVisitante_sinSesion_sirveSpa(String ruta) throws Exception {
        mockMvc.perform(get(ruta).accept(MediaType.TEXT_HTML))
            .andExpect(status().isOk())
            .andExpect(result -> {
                // SpaController hace forward:/index.html (MockMvc no ejecuta el forward, solo lo registra).
                String forward = result.getResponse().getForwardedUrl();
                String tipo = result.getResponse().getContentType();
                assertTrue("/index.html".equals(forward) || (tipo != null && tipo.startsWith(MediaType.TEXT_HTML_VALUE)),
                    ruta + " debe servir el SPA");
            });
    }

    @Test
    @DisplayName("ruta inexistente de visitante → 404 con el SPA (noindex), no 401")
    void rutaInexistente_404ConSpa() throws Exception {
        mockMvc.perform(get("/esta-ruta-no-existe/de-verdad").accept(MediaType.TEXT_HTML))
            .andExpect(status().isNotFound())
            .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
            .andExpect(result -> {
                String html = result.getResponse().getContentAsString();
                assertTrue(html.contains("id=\"root\""), "debe servir el index.html del SPA");
                assertTrue(html.contains("noindex"), "el 404 no debe indexarse");
            });
    }

    @Test
    @DisplayName("ruta inexistente pedida como JSON → sigue negada (el fallback es solo para navegación HTML)")
    void rutaInexistenteJson_noEntraAlFallback() throws Exception {
        mockMvc.perform(get("/esta-ruta-no-existe").accept(MediaType.APPLICATION_JSON))
            .andExpect(status().is4xxClientError())
            .andExpect(result -> assertNotEquals(200, result.getResponse().getStatus()));
    }

    @ParameterizedTest(name = "{0} con Accept text/html y sin token → negado (401/403)")
    @ValueSource(strings = {
        "/api/__probe_visitante__", "/api/pedidos", "/api/empresa/perfil", "/api/sucursales",
        "/api/admin/__security_test_probe__", "/api/usuarios", "/actuator/env",
    })
    void apiYRutasDeRol_siguenPidiendoAuth(String ruta) throws Exception {
        mockMvc.perform(get(ruta).accept(MediaType.TEXT_HTML))
            .andExpect(status().is4xxClientError())
            .andExpect(result -> {
                int s = result.getResponse().getStatus();
                assertTrue(s == 401 || s == 403, ruta + " debe dar 401/403 y dio " + s);
                String tipo = result.getResponse().getContentType();
                assertFalse(tipo != null && tipo.startsWith(MediaType.TEXT_HTML_VALUE)
                        && result.getResponse().getContentAsString().contains("id=\"root\""),
                    ruta + " no debe servir el SPA");
            });
    }

    @Test
    @DisplayName("USUARIO_FINAL en /api/admin/** sigue negado (el cambio no toca reglas de rol)")
    void usuarioFinal_enAdmin_sigueNegado() throws Exception {
        mockMvc.perform(get("/api/admin/__security_test_probe__").header("Authorization", userToken).accept(MediaType.TEXT_HTML))
            .andExpect(status().is4xxClientError())
            .andExpect(result -> assertNotEquals(404, result.getResponse().getStatus()));
    }
}
