-- V97: vinculación de Telegram por usuario — bot de clientes (Emprendedor / PyME / Negocio Plus)
-- Un usuario del panel vincula SU cuenta de Telegram con un código de un solo uso.
-- estado: PENDIENTE (código generado, aún sin /start) | ACTIVA | REVOCADA

CREATE TABLE IF NOT EXISTS hot_click_telegram_vinculacion_tb (
    id_vinculacion       BIGSERIAL PRIMARY KEY,
    fk_id_usuario        BIGINT NOT NULL REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE CASCADE,
    chat_id              BIGINT,
    telegram_username    VARCHAR(64),
    fk_id_empresa_activa BIGINT REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE SET NULL,
    codigo               VARCHAR(16),
    codigo_expira        TIMESTAMP,
    contexto             VARCHAR(64),
    estado               VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion       TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_vinculacion    TIMESTAMP,
    CONSTRAINT uq_tg_vinc_usuario UNIQUE (fk_id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_tg_vinc_chat    ON hot_click_telegram_vinculacion_tb(chat_id);
CREATE INDEX IF NOT EXISTS idx_tg_vinc_codigo  ON hot_click_telegram_vinculacion_tb(codigo);
CREATE INDEX IF NOT EXISTS idx_tg_vinc_empresa ON hot_click_telegram_vinculacion_tb(fk_id_empresa_activa);
