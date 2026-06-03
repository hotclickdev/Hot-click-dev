-- V52: Tabla para rate limiting distribuido multi-pod.
-- Reemplaza el ConcurrentHashMap proceso-local de RateLimitingFilter.
-- La PRIMARY KEY en bucket_key permite el UPSERT atómico en RateLimitingFilter.
-- idx_rl_expires acelera el DELETE nocturno en DataRetentionScheduler.

CREATE TABLE IF NOT EXISTS hot_click_rate_limit_tb (
    bucket_key   VARCHAR(200) PRIMARY KEY,
    count        INTEGER      NOT NULL DEFAULT 0,
    window_start BIGINT       NOT NULL,
    expires_at   BIGINT       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rl_expires
    ON hot_click_rate_limit_tb (expires_at);
