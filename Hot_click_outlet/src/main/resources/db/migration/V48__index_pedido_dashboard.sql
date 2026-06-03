-- Índice compuesto para queries de dashboard admin (filtra por empresa + estado + fecha)
-- Cubre el patrón: WHERE fk_id_empresa = ? AND estado_pedido = ? ORDER BY fecha_pedido DESC
CREATE INDEX IF NOT EXISTS idx_pedido_empresa_estado_fecha
    ON hot_click_pedido_tb (fk_id_empresa, estado_pedido, fecha_pedido DESC);
