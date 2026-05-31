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
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Sliding-window rate limiter for sensitive endpoints.
 * Applied per client IP. Emits RATE_LIMIT_TRIGGERED security events.
 *
 * Limits (POST, per IP):
 *   /api/auth/login              → 10 / 60s
 *   /api/auth/forgot-password    →  5 / 60s
 *   /api/auth/2fa/verify         →  5 / 60s   (tighter — 6-digit codes)
 *   /api/auth/2fa/email/send     →  3 / 300s  (OTP send — 3 per 5 min)
 *   /api/auth/verify-code        →  5 / 60s
 *   /api/auth/registro-empresa   →  5 / 60s
 *   /api/auth/register           →  5 / 3600s (registration — 5 per hour)
 *   /api/auth/send-verification  →  5 / 60s
 *   /api/auth/refresh            → 30 / 60s
 *   /api/auth/change-password    →  5 / 300s  (5 per 5 min)
 *   /api/contacto                →  5 / 60s
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    @Autowired
    private SecurityAuditService auditService;

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
        Map.entry("/api/contacto",                new Limit(5,    60))
    );

    // key: "ip:path" → sliding window bucket
    private final ConcurrentHashMap<String, SlidingWindow> buckets = new ConcurrentHashMap<>();

    private final ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "rate-limit-cleaner");
        t.setDaemon(true);
        return t;
    });

    public RateLimitingFilter() {
        cleaner.scheduleAtFixedRate(() -> {
            long now = Instant.now().getEpochSecond();
            buckets.entrySet().removeIf(e -> e.getValue().isExpired(now));
        }, 5, 5, TimeUnit.MINUTES);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String path = request.getServletPath();
        Limit limit = LIMITS.get(path);

        if (limit != null && "POST".equalsIgnoreCase(request.getMethod())) {
            String ip  = request.getRemoteAddr();
            String key = ip + ":" + path;

            SlidingWindow window = buckets.computeIfAbsent(key,
                k -> new SlidingWindow(limit.windowSeconds()));

            if (!window.tryAcquire(limit.maxRequests())) {
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

    // ── Sliding-window counter ───────────────────────────────────────────────

    private static class SlidingWindow {
        private final int windowSeconds;
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile long windowStart = Instant.now().getEpochSecond();

        SlidingWindow(int windowSeconds) { this.windowSeconds = windowSeconds; }

        boolean tryAcquire(int max) {
            long now = Instant.now().getEpochSecond();
            if (now - windowStart >= windowSeconds) {
                count.set(0);
                windowStart = now;
            }
            return count.incrementAndGet() <= max;
        }

        boolean isExpired(long now) {
            return now - windowStart > windowSeconds * 2L;
        }
    }
}
