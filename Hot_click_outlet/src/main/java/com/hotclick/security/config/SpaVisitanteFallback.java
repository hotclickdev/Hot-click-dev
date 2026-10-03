package com.hotclick.security.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.web.util.matcher.RequestMatcher;

import java.util.List;

/**
 * Rutas de VISITANTE que el SPA sirve en entrada directa (link compartido, Google, recarga) y el fallback
 * "ruta inexistente → SPA con su 404". Aprobado por el usuario el 2-oct-2026 con la condición de afectar solo
 * al visitante: no cambia ninguna regla de rol, y /api, /actuator y los paneles quedan fuera del fallback.
 */
public final class SpaVisitanteFallback {

    /** Páginas públicas de visitante que antes caían en {@code anyRequest().authenticated()} → HTTP 401. */
    static final String[] RUTAS_PUBLICAS_VISITANTE = {
        "/privacidad", "/terminos", "/cookies", "/envios", "/devoluciones", "/acuerdo-vendedores",
        "/encargo/*", "/cotizacion/*", "/sin-conexion",
    };

    /** Prefijos que nunca entran al fallback: API, actuator, errores y paneles/flujos de rol. */
    private static final List<String> PREFIJOS_EXCLUIDOS = List.of(
        "/api", "/actuator", "/error", "/ws", "/oauth2", "/login/oauth2", "/webhooks",
        "/admin", "/emprendedor", "/pyme", "/negocio-plus", "/pos", "/caja",
        "/visitante", "/prototipo", "/swagger-ui", "/v3/api-docs");

    /** Matcher para Spring Security: navegación HTML de visitante a una ruta sin regla propia. */
    static final RequestMatcher NAVEGACION_VISITANTE = SpaVisitanteFallback::esNavegacionVisitante;

    private SpaVisitanteFallback() {}

    /**
     * GET/HEAD de un navegador ({@code Accept: text/html}) a una ruta sin extensión de archivo que no esté bajo
     * /api, /actuator ni un panel de rol.
     */
    public static boolean esNavegacionVisitante(HttpServletRequest request) {
        String metodo = request.getMethod();
        if (!"GET".equals(metodo) && !"HEAD".equals(metodo)) return false;
        String accept = request.getHeader(HttpHeaders.ACCEPT);
        if (accept == null || !accept.contains(MediaType.TEXT_HTML_VALUE)) return false;
        String ruta = rutaSinContexto(request);
        if (ruta.isEmpty() || "/".equals(ruta)) return false;
        for (String prefijo : PREFIJOS_EXCLUIDOS) {
            if (ruta.equals(prefijo) || ruta.startsWith(prefijo + "/")) return false;
        }
        String ultimo = ruta.substring(ruta.lastIndexOf('/') + 1);
        return !ultimo.contains(".");
    }

    private static String rutaSinContexto(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null) return "";
        String contexto = request.getContextPath();
        if (contexto != null && !contexto.isEmpty() && uri.startsWith(contexto)) uri = uri.substring(contexto.length());
        return uri.length() > 1 && uri.endsWith("/") ? uri.substring(0, uri.length() - 1) : uri;
    }
}
