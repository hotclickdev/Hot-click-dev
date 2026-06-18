package com.hotclick.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Distributed rate limiter backed by hot_click_rate_limit_tb.
 * Safe for multi-pod deployments — all pods share the same DB counter.
 *
 * Fail-open: if DB is unavailable, request is allowed (availability > rate limiting).
 * Cleanup: DataRetentionScheduler.limpiarRateLimitExpirados() runs nightly.
 *
 * Typical usage:
 *   rateLimiter.tryAcquire("empresa:42:ai:burst", 10, 300)
 *   rateLimiter.tryAcquire("ip:1.2.3.4:/api/login", 10, 60)
 */
@Service
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    private final JdbcTemplate jdbc;

    public RateLimiter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // No usa ON CONFLICT / RETURNING (H2 no soporta ninguno de los dos en tests) —
    // lectura + insert-o-update explícito. La ventana de carrera entre el SELECT y el
    // INSERT/UPDATE es aceptable: el diseño ya es fail-open (disponibilidad > precisión).
    private static final String SELECT_WINDOW_SQL =
        "SELECT window_start FROM hot_click_rate_limit_tb WHERE bucket_key = ?";

    private static final String INSERT_SQL =
        "INSERT INTO hot_click_rate_limit_tb (bucket_key, count, window_start, expires_at) VALUES (?, 1, ?, ?)";

    private static final String RESET_WINDOW_SQL =
        "UPDATE hot_click_rate_limit_tb SET count = 1, window_start = ?, expires_at = ? WHERE bucket_key = ?";

    private static final String INCREMENT_SQL =
        "UPDATE hot_click_rate_limit_tb SET count = count + 1, expires_at = ? WHERE bucket_key = ?";

    private static final String COUNT_SQL =
        "SELECT count FROM hot_click_rate_limit_tb WHERE bucket_key = ?";

    /**
     * Returns true if this request is within the limit (allowed).
     * Returns false if the limit is exceeded (block it).
     *
     * @param key           Unique bucket key, e.g. "ip:1.2.3.4:/api/login"
     * @param maxRequests   Maximum number of requests allowed in the window
     * @param windowSeconds Length of the time window in seconds
     */
    public boolean tryAcquire(String key, int maxRequests, int windowSeconds) {
        long now     = Instant.now().getEpochSecond();
        long expires = now + windowSeconds;
        try {
            int count = incrementarYContar(key, now, expires, windowSeconds);
            return count <= maxRequests;
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] DB unavailable, fail-open: {}", e.getMessage());
            return true;
        }
    }

    private int incrementarYContar(String key, long now, long expires, int windowSeconds) {
        java.util.List<Long> existing = jdbc.queryForList(SELECT_WINDOW_SQL, Long.class, key);
        if (existing.isEmpty()) {
            try {
                jdbc.update(INSERT_SQL, key, now, expires);
                return 1;
            } catch (DataIntegrityViolationException dup) {
                // Carrera: otro hilo insertó primero — continúa por la rama de incremento.
            }
            existing = jdbc.queryForList(SELECT_WINDOW_SQL, Long.class, key);
        }
        long windowStart = existing.isEmpty() ? now : existing.get(0);
        if (windowStart + windowSeconds <= now) {
            jdbc.update(RESET_WINDOW_SQL, now, expires, key);
            return 1;
        }
        jdbc.update(INCREMENT_SQL, expires, key);
        Integer count = jdbc.queryForObject(COUNT_SQL, Integer.class, key);
        return count == null ? 1 : count;
    }
}
