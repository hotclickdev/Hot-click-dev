-- WhatsApp message log — registra cada mensaje enviado via Meta Cloud API
CREATE TABLE IF NOT EXISTS hot_click_wa_log_tb (
    id                BIGSERIAL PRIMARY KEY,
    fk_id_usuario     BIGINT       REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE SET NULL,
    fk_id_empresa     BIGINT       REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE SET NULL,
    telefono          VARCHAR(30)  NOT NULL,
    tipo_mensaje      VARCHAR(40)  NOT NULL,   -- CONFIRMACION_PEDIDO, GUIA_ASIGNADA, etc.
    variante          VARCHAR(60),             -- nombre de la variante usada
    texto_enviado     TEXT         NOT NULL,
    estado            VARCHAR(20)  NOT NULL DEFAULT 'ENVIADO', -- ENVIADO, ERROR, SIMULADO
    error_detalle     VARCHAR(500),
    meta_message_id   VARCHAR(100),            -- ID devuelto por Meta API
    fecha_envio       TIMESTAMP    NOT NULL DEFAULT NOW(),
    pedido_numero     VARCHAR(20)              -- desnormalizado para búsqueda rápida
);

CREATE INDEX IF NOT EXISTS idx_wa_log_usuario  ON hot_click_wa_log_tb(fk_id_usuario);
CREATE INDEX IF NOT EXISTS idx_wa_log_empresa  ON hot_click_wa_log_tb(fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_wa_log_fecha    ON hot_click_wa_log_tb(fecha_envio DESC);
CREATE INDEX IF NOT EXISTS idx_wa_log_tipo     ON hot_click_wa_log_tb(tipo_mensaje);
