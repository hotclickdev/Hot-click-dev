package com.hotclick.security;

import com.hotclick.service.SecurityAuditService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Distributed IP-level rate limiter (fixed-window, per POST).
 * State is stored in hot_click_rate_limit_tb — safe for multi-pod.
 *
 * Fail-open: if DB fails the request passes. Auth endpoints have account
 * lockout as a second layer (UsuarioService.incrementarIntentosFallidos).
 *
 * Limits (POST, per IP):
 *   Auth
 *   ────────────────────────────────────────────
 *   /api/auth/login              → 10 / 60s
 *   /api/auth/forgot-password    →  5 / 60s
 *   /api/auth/2fa/verify         →  5 / 60s
 *   /api/auth/2fa/email/send     →  3 / 300s
 *   /api/auth/verify-code        →  5 / 60s
 *   /api/auth/registro-empresa   →  5 / 60s
 *   /api/auth/register           →  5 / 3600s
 *   /api/auth/send-verification  →  5 / 60s
 *   /api/auth/refresh            → 30 / 60s
 *   /api/auth/change-password    →  5 / 300s
 *
 *   General
 *   ────────────────────────────────────────────
 *   /api/contacto                →  5 / 60s
 *   /api/pedidos                 → 15 / 60s
 *   /api/payment/checkout        →  3 / 60s
 *
 *   AI (IP-level; per-empresa burst in AiCopilotController)
 *   ────────────────────────────────────────────
 *   /api/public/chat                      → 10 / 60s
 *   /api/public/shopping-assistant/chat   → 10 / 60s
 *   /api/admin/ai/chat                    →  5 / 60s
 *
 * Limits (GET, per IP — endpoints públicos sin auth):
 *   /api/hacienda/contribuyente/** →  10 / 60s  (proxy a API externa de CR)
 *   /api/convenios/publicos        →  60 / 60s
 *   /api/marcas/publicas           →  60 / 60s
 *   /api/categorias/**             →  60 / 60s
 *   /api/blog/publico/**           →  60 / 60s
 *   /api/public/**                 →  60 / 60s
 *   /api/tienda/**                 → 120 / 60s
 *   /api/productos/**              → 120 / 60s
 */
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    @Autowired private SecurityAuditService auditService;
    @Autowired private RateLimiter          rateLimiter;

    private record Limit(int maxRequests, int windowSeconds) {}
    private record PrefixLimit(String prefix, int maxRequests, int windowSeconds) {}
    private record GetLimit(String prefix, int maxRequests, int windowSeconds) {}

    // Exact-path limits (POST only)
    private static final Map<String, Limit> LIMITS = Map.ofEntries(
        // Auth
        Map.entry("/api/auth/login",              new Limit(10,   60)),
        Map.entry("/api/auth/forgot-password",    new Limit(5,    60)),
        Map.entry("/api/auth/2fa/verify",         new Limit(5,    60)),
        Map.entry("/api/auth/2fa/email/send",     new Limit(3,   300)),
        Map.entry("/api/auth/verify-code",        new Limit(5,    60)),
        Map.entry("/api/auth/registro-empresa",   new Limit(5,    60)),
        Map.entry("/api/auth/register",           new Limit(5,  3600)),
        Map.entry("/api/auth/send-verification",  new Limit(5,    60)),
        Map.entry("/api/auth/refresh",            new Limit(30,   60)),
        Map.entry("/api/auth/change-password",    new Limit(5,   300)),
        // General
        Map.entry("/api/contacto",                new Limit(5,    60)),
        Map.entry("/api/pedidos",                 new Limit(15,   60)),
        Map.entry("/api/payment/checkout",        new Limit(3,    60)),
        // AI — IP level (per-empresa burst handled in controller)
        Map.entry("/api/public/chat",                         new Limit(10,  60)),
        Map.entry("/api/public/shopping-assistant/chat",      new Limit(10,  60)),
        Map.entry("/api/admin/ai/chat",                       new Limit(5,   60))
    );

    // Prefix-based limits for paths with variables (e.g. /api/pedidos/123/notificar).
    // Matched in order — first prefix wins. Keep this list short.
    private static final List<PrefixLimit> PREFIX_LIMITS = List.of(
        // Prevent admins from accidentally spamming customers with email notifications.
        new PrefixLimit("/api/pedidos/", 5, 60)   // 5 notificar calls/min per IP
    );

    // GET limits for public endpoints vulnerable to scraping or external-API abuse.
    // Matched in order — first prefix wins. Only covers unauthenticated-friendly routes.
    private static final List<GetLimit> GET_LIMITS = List.of(
        new GetLimit("/api/hacienda/contribuyente",      10,  60), // proxy a API Hacienda CR
        new GetLimit("/api/convenios/publicos",          60,  60),
        new GetLimit("/api/marcas/publicas",             60,  60),
        new GetLimit("/api/categorias",                  60,  60),
        new GetLimit("/api/blog/publico",                60,  60),
        new GetLimit("/api/public",                      60,  60),
        new GetLimit("/api/tienda",                     120,  60),
        new GetLimit("/api/productos",                  120,  60)
    );

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        // getServletPath() devuelve "" en MockMvc (y con el dispatcher mapeado en "/"
        // bajo ciertos contenedores) — usar requestURI menos contextPath es portable.
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method)) {
            String ip    = request.getRemoteAddr();
            Limit  limit = LIMITS.get(path);

            // Exact-path check
            if (limit == null) {
                // Prefix check — only for POST paths with ID segments (e.g. /notificar)
                for (PrefixLimit pl : PREFIX_LIMITS) {
                    if (path.startsWith(pl.prefix()) && path.endsWith("/notificar")) {
                        limit = new Limit(pl.maxRequests(), pl.windowSeconds());
                        break;
                    }
                }
            }

            if (limit != null) {
                String key = "ip:" + ip + ":" + path;
                if (!rateLimiter.tryAcquire(key, limit.maxRequests(), limit.windowSeconds())) {
                    log.warn("[RATE-LIMIT] ip={} path={}", ip, path);
                    try { auditService.logRateLimitTriggered(ip, path); } catch (Exception ignored) {}
                    response.setStatus(429);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write(
                        "{\"success\":false,\"message\":\"Demasiados intentos. Esperá un momento antes de volver a intentar.\"}");
                    return;
                }
            }
        } else if ("GET".equalsIgnoreCase(method)) {
            String ip = request.getRemoteAddr();
            for (GetLimit gl : GET_LIMITS) {
                if (path.startsWith(gl.prefix())) {
                    String key = "ip:" + ip + ":GET:" + gl.prefix();
                    if (!rateLimiter.tryAcquire(key, gl.maxRequests(), gl.windowSeconds())) {
                        log.warn("[RATE-LIMIT] GET ip={} path={}", ip, path);
                        try { auditService.logRateLimitTriggered(ip, path); } catch (Exception ignored) {}
                        response.setStatus(429);
                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        response.getWriter().write(
                            "{\"success\":false,\"message\":\"Demasiadas solicitudes. Esperá un momento antes de volver a intentar.\"}");
                        return;
                    }
                    break; // first prefix wins
                }
            }
        }

        chain.doFilter(request, response);
    }
}
