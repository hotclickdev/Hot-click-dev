-- V70: Columna de feedback (👍/👎) en mensajes del asistente de compras.
-- NULL = sin votar, 1 = positivo, -1 = negativo.
ALTER TABLE hot_click_chat_mensaje_shopping_tb
    ADD COLUMN IF NOT EXISTS feedback SMALLINT
    CONSTRAINT chk_chat_feedback CHECK (feedback IN (1, -1));
