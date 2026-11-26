-- AG-07: atribucion "venta del bot". El pedido guarda el canal de origen y el enlace de compra del que nacio.
-- Aditiva e idempotente. origen_canal (WHATSAPP, INSTAGRAM, MESSENGER) es independiente de la columna origen
-- (ONLINE, POS...), que tiene el check chk_pedido_origen.
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS origen_canal VARCHAR(20);
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS fk_id_enlace_compra BIGINT
    REFERENCES hot_click_enlace_compra_tb (id_enlace_compra) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pedido_enlace_compra ON hot_click_pedido_tb (fk_id_enlace_compra);
