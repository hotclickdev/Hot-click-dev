-- S4-20: numeración de pedidos propia de cada tienda. Aditiva: los pedidos viejos conservan
-- numero_pedido y quedan con numero_tienda NULL.
CREATE TABLE IF NOT EXISTS hot_click_pedido_secuencia_tienda_tb (
    fk_id_empresa BIGINT PRIMARY KEY REFERENCES hot_click_empresa_tb(id_empresa),
    ultimo        BIGINT NOT NULL DEFAULT 0
);

ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS numero_tienda BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_pedido_empresa_numero_tienda
    ON hot_click_pedido_tb (fk_id_empresa, numero_tienda)
    WHERE numero_tienda IS NOT NULL;
