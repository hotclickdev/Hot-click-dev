-- V145: enlace público de seguimiento de pedido sin cuenta (/seguimiento/{token}).
-- Token aleatorio de 64 hex (256 bits) — nunca se consulta un pedido por su id numérico.
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS token_seguimiento VARCHAR(64);

-- Pedidos anteriores: se les genera token para que los correos nuevos puedan enlazarlos.
UPDATE hot_click_pedido_tb
   SET token_seguimiento = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 WHERE token_seguimiento IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pedido_token_seguimiento
    ON hot_click_pedido_tb (token_seguimiento);
