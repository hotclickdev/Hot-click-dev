-- Tabla para carritos abandonados (recuperación por email)
CREATE TABLE IF NOT EXISTS hot_click_carrito_abandonado_tb (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT,
    session_id  VARCHAR(128) NOT NULL,
    items       TEXT         NOT NULL,
    email       VARCHAR(255),
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carrito_abandonado_session_status
    ON hot_click_carrito_abandonado_tb (session_id, status);

CREATE INDEX IF NOT EXISTS idx_carrito_abandonado_status_created
    ON hot_click_carrito_abandonado_tb (status, created_at);
