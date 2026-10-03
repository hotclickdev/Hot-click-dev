package com.hotclick.controller.spa;

import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * index.html del SPA para el 404 de visitante (la SPA pinta la pantalla 404 de Figma 45:2198).
 * Se lee una vez; si el build del frontend no está en el classpath devuelve vacío y se mantiene la respuesta JSON.
 */
@Component
public class SpaIndexHtml {

    private static final String META_NOINDEX = "<meta name=\"robots\" content=\"noindex, follow\" />";

    private final ResourceLoader resourceLoader;
    private volatile String contenido;

    public SpaIndexHtml(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    /** index.html con {@code noindex} para que Google no indexe rutas inexistentes. */
    public Optional<String> paraNoEncontrado() {
        String html = leer();
        if (html == null) return Optional.empty();
        return Optional.of(html.replaceFirst("(?i)<head>", "<head>\n    " + META_NOINDEX));
    }

    private String leer() {
        if (contenido != null) return contenido;
        Resource recurso = resourceLoader.getResource("classpath:/static/index.html");
        if (!recurso.exists()) return null;
        try (InputStream in = recurso.getInputStream()) {
            contenido = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            return contenido;
        } catch (IOException e) {
            return null;
        }
    }
}
