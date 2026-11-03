-- TG3: dedup persistente de updates de Telegram. Se marca ANTES de procesar (INSERT atómico por PK);
-- un reintento del mismo update_id falla el INSERT y se ignora. Aditiva: tabla nueva, no toca datos.
CREATE TABLE IF NOT EXISTS hot_click_telegram_update_procesado_tb (
    update_id BIGINT    NOT NULL PRIMARY KEY,
    creado    TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tg_update_procesado_creado ON hot_click_telegram_update_procesado_tb (creado);
