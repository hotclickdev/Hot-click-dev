-- V87: Tabla de IPs bloqueadas manualmente desde Security Center
CREATE TABLE IF NOT EXISTS hot_click_ip_bloqueada_tb (
    id_ip_bloqueada  BIGSERIAL PRIMARY KEY,
    ip_address       VARCHAR(50)  NOT NULL UNIQUE,
    motivo           VARCHAR(500),
    bloqueada_por    VARCHAR(150),
    fecha_bloqueo    TIMESTAMP    NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMP,
    activa           BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_ip_bloqueada_ip      ON hot_click_ip_bloqueada_tb(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_bloqueada_activa  ON hot_click_ip_bloqueada_tb(activa);
