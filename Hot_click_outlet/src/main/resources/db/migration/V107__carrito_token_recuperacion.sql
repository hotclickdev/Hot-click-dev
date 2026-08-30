-- Token opaco para recuperar carrito abandonado desde el email (no usar el ID secuencial).
-- Numeración V107: V105/V106 ya existían en la rama; el hueco V104 es intencional.
ALTER TABLE hot_click_carrito_abandonado_tb
    ADD COLUMN IF NOT EXISTS token_recuperacion VARCHAR(36);

UPDATE hot_click_carrito_abandonado_tb
SET token_recuperacion = gen_random_uuid()::text
WHERE token_recuperacion IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_carrito_abandonado_token
    ON hot_click_carrito_abandonado_tb (token_recuperacion);
