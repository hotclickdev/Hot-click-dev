-- ============================================================
-- V20: Security Operations — Audit Log + Alert tables
--
-- Adds:
--   hot_click_security_audit_log_tb  — persistent security event log
--   hot_click_security_alert_tb      — attack detection alerts
--
-- All changes use IF NOT EXISTS for idempotency.
-- ============================================================

-- ── Security audit log ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hot_click_security_audit_log_tb (
    id          BIGSERIAL    PRIMARY KEY,
    timestamp   TIMESTAMP    NOT NULL DEFAULT NOW(),
    event_type  VARCHAR(50)  NOT NULL,
    severity    VARCHAR(10)  NOT NULL,
    user_id     BIGINT,
    email       VARCHAR(150),
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(300),
    endpoint    VARCHAR(200),
    metadata    TEXT,
    CONSTRAINT chk_sal_severity CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_sal_timestamp   ON hot_click_security_audit_log_tb (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sal_event_type  ON hot_click_security_audit_log_tb (event_type);
CREATE INDEX IF NOT EXISTS idx_sal_severity    ON hot_click_security_audit_log_tb (severity);
CREATE INDEX IF NOT EXISTS idx_sal_user_id     ON hot_click_security_audit_log_tb (user_id);
CREATE INDEX IF NOT EXISTS idx_sal_ip_address  ON hot_click_security_audit_log_tb (ip_address);

-- ── Security alerts ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hot_click_security_alert_tb (
    id          BIGSERIAL    PRIMARY KEY,
    alert_type  VARCHAR(50)  NOT NULL,
    severity    VARCHAR(10)  NOT NULL,
    user_id     BIGINT,
    ip_address  VARCHAR(45),
    message     VARCHAR(500) NOT NULL,
    details     TEXT,
    resolved    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    CONSTRAINT chk_alert_severity CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_alert_unresolved ON hot_click_security_alert_tb (resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_severity   ON hot_click_security_alert_tb (severity);
CREATE INDEX IF NOT EXISTS idx_alert_type       ON hot_click_security_alert_tb (alert_type);
