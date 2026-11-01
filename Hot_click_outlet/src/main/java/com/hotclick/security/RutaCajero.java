package com.hotclick.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UrlPathHelper;

import java.util.List;

/**
 * Ruta normalizada para las guardas de CAJERO: {@link UrlPathHelper#getPathWithinApplication} con decode, sin
 * contenido tras {@code ;} y sin {@code //}; luego se resuelven {@code .} y {@code ..} (p. ej. {@code %2e%2e}) para
 * que {@code /api/pos/%2e%2e/pedidos} no pase como {@code /api/pos/**}. Si queda algún {@code ..} sin resolver,
 * devuelve null y la guarda deniega.
 */
final class RutaCajero {

    private static final UrlPathHelper HELPER = new UrlPathHelper();
    private static final AntPathMatcher MATCHER = new AntPathMatcher();

    static {
        HELPER.setUrlDecode(true);
        HELPER.setRemoveSemicolonContent(true);
    }

    private RutaCajero() {}

    static String normalizar(HttpServletRequest req) {
        String ruta = HELPER.getPathWithinApplication(req);
        if (ruta == null || ruta.isEmpty()) return null;
        ruta = ruta.replace('\\', '/').replaceAll("/{2,}", "/");
        ruta = StringUtils.cleanPath(ruta);
        if (!ruta.startsWith("/") || ruta.contains("..")) return null;
        return ruta;
    }

    static boolean coincide(List<String> patrones, String ruta) {
        if (ruta == null) return false;
        for (String p : patrones) if (MATCHER.match(p, ruta)) return true;
        return false;
    }
}
