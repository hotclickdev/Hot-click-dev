package com.hotclick.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Restringe ciertos endpoints a llamadas server-to-server.
 *
 * El cliente debe incluir: X-Internal-Secret: <valor de INTERNAL_SECRET>
 * Sin él, la request es rechazada con 403 antes de llegar a Spring Security.
 *
 * Rutas protegidas: configuradas en PROTECTED_PATHS.
 * Agregar nuevos endpoints internos aquí en vez de en SecurityConfig.
 */
public class InternalSecretFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(InternalSecretFilter.class);

    private static final String HEADER = "X-Internal-Secret";

    // Endpoints que SOLO pueden llamarse con el header secreto.
    // Formato: "METHOD /ruta/exacta"
    // reset-datos NO va aquí: es un botón del propio panel admin (EMPRENDEDOR
    // restablece los datos de SU negocio), autenticado con JWT normal — el
    // control de acceso es @PreAuthorize + aislamiento por empresa en el
    // controller, no un secreto server-to-server que el frontend nunca envía.
    private static final Set<String> PROTECTED = Set.of(
        "POST /api/admin/seed-demo"        // por si se agrega en el futuro
    );

    @Value("${internal.secret:}")
    private String internalSecret;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        String key = request.getMethod().toUpperCase() + " " + request.getServletPath();

        if (PROTECTED.contains(key)) {
            // Si el secret no está configurado en producción, bloquear todo acceso
            if (internalSecret.isBlank()) {
                log.error("[INTERNAL] Endpoint {} bloqueado: INTERNAL_SECRET no configurado", key);
                reject(response, "Endpoint deshabilitado en esta instancia");
                return;
            }

            String provided = request.getHeader(HEADER);
            if (provided == null || !internalSecret.equals(provided)) {
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null) ip = request.getRemoteAddr();
                log.warn("[INTERNAL] Acceso denegado a {} desde ip={}", key, ip);
                reject(response, "Acceso no autorizado");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"success\":false,\"message\":\"" + message + "\"}");
    }
}
