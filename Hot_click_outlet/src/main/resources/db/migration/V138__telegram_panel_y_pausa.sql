ALTER TABLE hot_click_telegram_vinculacion_tb
    ADD COLUMN IF NOT EXISTS panel_message_id BIGINT;

ALTER TABLE hot_click_telegram_vinculacion_tb
    ADD COLUMN IF NOT EXISTS pausado_hasta TIMESTAMP;

COMMENT ON COLUMN hot_click_telegram_vinculacion_tb.panel_message_id IS
    'Mensaje del bot que se reescribe en cada paso del chat';
COMMENT ON COLUMN hot_click_telegram_vinculacion_tb.pausado_hasta IS
    'Pausa temporal del chat por actividad sospechosa; no bloquea el login';
