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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;

/**
 * Rate limiter distribuido: estado compartido en PostgreSQL.
 * Funciona correctamente en multi-pod (todos los pods ven el mismo contador).
 *
 * Algoritmo: fixed-window counter con UPSERT atómico.
 * La PRIMARY KEY de hot_click_rate_limit_tb garantiza atomicidad del check-and-increment.
 * Limpieza nocturna: DataRetentionScheduler.limpiarRateLimitExpirados().
 *
 * Fail-open: si la BD falla, la request pasa (disponibilidad > rate limiting).
 * Para endpoints críticos de auth esto es aceptable porque el account lockout
 * (UsuarioService.incrementarIntentosFallidos) es una segunda capa de defensa.
 *
 * Límites (POST, per IP):
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
 *   /api/contacto                →  5 / 60s
 *   /api/public/chat             → 10 / 60s
 */
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    @Autowired
    private SecurityAuditService auditService;

    @Autowired
    private JdbcTemplate jdbc;

    private record Limit(int maxRequests, int windowSeconds) {}

    private static final Map<String, Limit> LIMITS = Map.ofEntries(
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
        Map.entry("/api/contacto",                new Limit(5,    60)),
        Map.entry("/api/public/chat",             new Limit(10,   60))
    );

    // UPSERT atómico: inserta un nuevo bucket o incrementa el existente dentro de la ventana.
    // Si la ventana expiró (window_start + windowSeconds <= now) reinicia count a 1.
    // RETURNING count devuelve el valor post-update para comparar con max.
    private static final String UPSERT_SQL = """
        INSERT INTO hot_click_rate_limit_tb (bucket_key, count, window_start, expires_at)
        VALUES (?, 1, ?, ?)
        ON CONFLICT (bucket_key) DO UPDATE SET
          count        = CASE
                           WHEN hot_click_rate_limit_tb.window_start + ? <= ?
                           THEN 1
                           ELSE hot_click_rate_limit_tb.count + 1
                         END,
          window_start = CASE
                           WHEN hot_click_rate_limit_tb.window_start + ? <= ?
                           THEN ?
                           ELSE hot_click_rate_limit_tb.window_start
                         END,
          expires_at   = ?
        RETURNING count
        """;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String path = request.getServletPath();
        Limit limit = LIMITS.get(path);

        if (limit != null && "POST".equalsIgnoreCase(request.getMethod())) {
            String ip  = request.getRemoteAddr();
            String key = ip + ":" + path;

            if (!tryAcquireDb(key, limit.maxRequests(), limit.windowSeconds())) {
                log.warn("[RATE-LIMIT] ip={} path={}", ip, path);
                try {
                    auditService.logRateLimitTriggered(ip, path);
                } catch (Exception ignored) {}

                response.setStatus(429);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write(
                    "{\"success\":false,\"message\":\"Demasiados intentos. Esperá un momento antes de volver a intentar.\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private boolean tryAcquireDb(String key, int max, int windowSeconds) {
        long now     = Instant.now().getEpochSecond();
        long expires = now + windowSeconds;
        try {
            Integer count = jdbc.queryForObject(UPSERT_SQL, Integer.class,
                key, now, expires,           // INSERT: bucket_key, window_start, expires_at
                (long) windowSeconds, now,   // CASE count:        window_start + window <= now
                (long) windowSeconds, now,   // CASE window_start: window_start + window <= now
                now,                         // new window_start when resetting
                expires                      // new expires_at
            );
            return count != null && count <= max;
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] DB unavailable, fail-open: {}", e.getMessage());
            return true;
        }
    }
}
