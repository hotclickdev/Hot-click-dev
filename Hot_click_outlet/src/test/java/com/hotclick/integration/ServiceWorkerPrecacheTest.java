package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * QA-PROD-2: si una URL del precache del service worker no responde 200 (p. ej. 401 de Spring Security),
 * la instalación del SW falla y el navegador muestra «Failed to update a ServiceWorker» en todas las páginas.
 * QA-PROD-1: la CSP permite las miniaturas de YouTube.
 */
@DisplayName("[QA-PROD-1/2] Service worker y CSP de miniaturas")
class ServiceWorkerPrecacheTest extends BaseIntegrationTest {

    private static final Path SW = Path.of("src/main/resources/static/sw.js");
    private static final Pattern URL_PRECACHE = Pattern.compile("\\{url:\"([^\"]+)\"");

    @Test
    @DisplayName("Cada archivo del precache (fuera de assets/) se sirve sin sesión")
    void precacheSinSesion() throws Exception {
        assertThat(Files.exists(SW)).as("static/sw.js generado por el build").isTrue();
        Matcher m = URL_PRECACHE.matcher(Files.readString(SW));
        List<String> urls = new ArrayList<>();
        while (m.find()) {
            if (!m.group(1).startsWith("assets/")) urls.add(m.group(1));
        }
        assertThat(urls).isNotEmpty().noneMatch(u -> u.startsWith("email/"));
        for (String u : urls) {
            mockMvc.perform(get("/" + u)).andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("sw.js y los íconos de correo son públicos")
    void swEIconosCorreo() throws Exception {
        mockMvc.perform(get("/sw.js")).andExpect(status().isOk());
        mockMvc.perform(get("/email/icono-check.png")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("img-src permite https://i.ytimg.com (miniatura del video)")
    void cspMiniaturaYoutube() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(header().string("Content-Security-Policy", containsString("https://i.ytimg.com")));
    }
}
