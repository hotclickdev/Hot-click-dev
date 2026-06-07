package com.hotclick.utils;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Sanitiza texto de entrada para prevenir XSS, inyección y caracteres de control.
 * Usar antes de persistir cualquier campo de texto libre que provenga del usuario.
 */
@Component
public class InputSanitizer {

    // Caracteres de control ASCII (excepto \t, \n, \r)
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]");

    // Solo letras, números, guiones y puntos — para slugs
    private static final Pattern SLUG_ALLOWED = Pattern.compile("[^a-z0-9\\-]");

    /**
     * Elimina todo HTML/JS del texto y caracteres de control.
     * Usar para nombres, descripciones, comentarios libres.
     */
    public String clean(String value) {
        if (value == null) return null;
        String stripped = Jsoup.clean(value, Safelist.none());
        return CONTROL_CHARS.matcher(stripped).replaceAll("").trim();
    }

    /**
     * Permite HTML básico seguro (b, i, em, strong, ul, ol, li, p, br).
     * Usar para contenido de blog o descripciones largas con formato.
     */
    public String cleanRichText(String value) {
        if (value == null) return null;
        return Jsoup.clean(value, Safelist.basic());
    }

    /**
     * Normaliza email: lowercase + trim + sin caracteres peligrosos.
     */
    public String cleanEmail(String value) {
        if (value == null) return null;
        return clean(value).toLowerCase();
    }

    /**
     * Normaliza slug: lowercase, solo letras/números/guiones, sin espacios.
     */
    public String cleanSlug(String value) {
        if (value == null) return null;
        return SLUG_ALLOWED.matcher(clean(value).toLowerCase().replace(" ", "-")).replaceAll("");
    }

    /**
     * Trunca a maxLength si excede, luego limpia.
     */
    public String cleanWithLimit(String value, int maxLength) {
        if (value == null) return null;
        String cleaned = clean(value);
        return cleaned.length() > maxLength ? cleaned.substring(0, maxLength) : cleaned;
    }
}
