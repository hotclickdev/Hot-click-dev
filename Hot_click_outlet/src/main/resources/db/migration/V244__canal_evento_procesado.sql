-- AG-02: dedup persistente de mensajes entrantes de Meta (WhatsApp, Instagram, Messenger).
-- Se marca ANTES de procesar con un INSERT atómico por PK; un reintento de Meta con el mismo id
-- falla el INSERT y se ignora. Aditiva: tabla nueva, no toca datos.
CREATE TABLE IF NOT EXISTS hot_click_canal_evento_procesado_tb (
    evento_id VARCHAR(200) NOT NULL PRIMARY KEY,
    canal     VARCHAR(20)  NOT NULL,
    creado    TIMESTAMP    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_canal_evento_procesado_creado ON hot_click_canal_evento_procesado_tb (creado);
