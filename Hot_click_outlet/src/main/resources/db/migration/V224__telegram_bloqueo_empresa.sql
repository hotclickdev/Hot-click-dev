-- V224 (03-nov-2026) MEDIO N1 (área 8): «Revocar» en el Telegram del equipo bloquea SOLO el bot para esa
-- empresa; la membresía web (miembro_empresa) no se toca. Aditiva: tabla nueva, no toca datos.
CREATE TABLE IF NOT EXISTS hot_click_telegram_bloqueo_empresa_tb (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT    NOT NULL,
    empresa_id  BIGINT    NOT NULL,
    creado      TIMESTAMP NOT NULL,
    creado_por  BIGINT,
    CONSTRAINT uq_tg_bloqueo_usuario_empresa UNIQUE (usuario_id, empresa_id)
);
