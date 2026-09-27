-- Compra multi-negocio: un pago a HotClick agrupa un pedido (paquete) por negocio.
CREATE TABLE IF NOT EXISTS hot_click_compra_tb (
    id_compra            BIGSERIAL    PRIMARY KEY,
    numero_compra        VARCHAR(20)  NOT NULL UNIQUE,
    fecha_compra         TIMESTAMP    NOT NULL,
    total_compra         INTEGER      NOT NULL,
    cantidad_paquetes    INTEGER      NOT NULL,
    metodo_pago          VARCHAR(30)  NOT NULL,
    fk_id_usuario_final  BIGINT       NOT NULL REFERENCES hot_click_usuario_tb(id_usuario),
    fk_id_estado         INTEGER      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_compra_usuario_final ON hot_click_compra_tb (fk_id_usuario_final);

ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS fk_id_compra BIGINT REFERENCES hot_click_compra_tb(id_compra);
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS numero_paquete INTEGER;
CREATE INDEX IF NOT EXISTS idx_pedido_compra ON hot_click_pedido_tb (fk_id_compra);

ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS fk_id_compra BIGINT REFERENCES hot_click_compra_tb(id_compra);
CREATE INDEX IF NOT EXISTS idx_pago_compra ON hot_click_pago_tb (fk_id_compra);
