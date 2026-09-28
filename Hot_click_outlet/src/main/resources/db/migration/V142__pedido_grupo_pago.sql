-- V142: un checkout multivendedor crea un subpedido por bodega/vendedor bajo un mismo pago.
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS grupo_pago VARCHAR(40);
CREATE INDEX IF NOT EXISTS idx_pedido_grupo_pago ON hot_click_pedido_tb (grupo_pago);
