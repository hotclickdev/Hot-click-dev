package com.hotclick.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * URL pública de la app ({@code app.url}, variable de entorno APP_URL): con perfil prod/production/staging
 * la app NO arranca si queda vacía, sin https, en localhost, en loopback o como IP literal.
 * De {@code app.url} salen el success/cancel de ONVO, Tilopay, Stripe y los enlaces de correos; si apuntara a
 * localhost el comprador volvería a una URL que no existe. Fuera de esos perfiles no hace nada (dev usa localhost).
 * El mensaje de error no imprime el valor configurado.
 */
@Component
public class UrlPublicaArranqueGuard {

    static final String MENSAJE = "[CONFIG-URL] APP_URL (app.url) debe ser una URL https con dominio público "
        + "(p. ej. https://hotclick.lat) en prod/production/staging; no puede estar vacía, en localhost ni ser una IP. La app no arranca.";

    private static final Pattern IP_LITERAL = Pattern.compile("^(\\d{1,3}\\.){3}\\d{1,3}$");

    private final Environment environment;
    private final String appUrl;

    public UrlPublicaArranqueGuard(Environment environment, @Value("${app.url:}") String appUrl) {
        this.environment = environment;
        this.appUrl = appUrl;
    }

    @PostConstruct
    public void verificar() {
        if (!perfilPublico(environment.getActiveProfiles())) {
            return;
        }
        if (!urlPublicaValida(appUrl)) {
            throw new IllegalStateException(MENSAJE);
        }
    }

    static boolean perfilPublico(String[] perfiles) {
        if (perfiles == null) {
            return false;
        }
        for (String p : perfiles) {
            String n = p == null ? "" : p.trim().toLowerCase(Locale.ROOT);
            if (n.equals("prod") || n.equals("production") || n.equals("staging")) {
                return true;
            }
        }
        return false;
    }

    static boolean urlPublicaValida(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        try {
            URI uri = URI.create(url.trim());
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || host.isBlank()) {
                return false;
            }
            String h = host.toLowerCase(Locale.ROOT);
            if (h.equals("localhost") || h.endsWith(".localhost") || h.endsWith(".local") || !h.contains(".")) {
                return false;
            }
            return !(h.contains(":") || h.startsWith("[") || IP_LITERAL.matcher(h).matches());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
