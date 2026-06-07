package com.hotclick.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    // Fixed-window UPSERT. RETURNING count is post-increment value.
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
            Integer count = jdbc.queryForObject(UPSERT_SQL, Integer.class,
                key, now, expires,
                (long) windowSeconds, now,
                (long) windowSeconds, now,
                now,
                expires
            );
            return count != null && count <= maxRequests;
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] DB unavailable, fail-open: {}", e.getMessage());
            return true;
        }
    }
}
