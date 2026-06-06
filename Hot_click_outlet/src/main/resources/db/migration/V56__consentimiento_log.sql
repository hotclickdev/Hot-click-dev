-- Bitácora de consentimiento informado (Ley N.° 8968, PRODHAB)
-- Registra fecha, hora e IP de cada aceptación de términos/privacidad

CREATE TABLE IF NOT EXISTS hot_click_consentimiento_log_tb (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_id          BIGINT,
    tipo                VARCHAR(30)  NOT NULL,  -- REGISTRO | CHECKOUT | VENDEDOR
    version_doc         VARCHAR(20)  NOT NULL DEFAULT '2025-06-05',
    ip_address          VARCHAR(50),
    user_agent          VARCHAR(500),
    aceptado            BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_consentimiento TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consentimiento_usuario
    ON hot_click_consentimiento_log_tb (usuario_id);

CREATE INDEX IF NOT EXISTS idx_consentimiento_tipo_fecha
    ON hot_click_consentimiento_log_tb (tipo, fecha_consentimiento);
