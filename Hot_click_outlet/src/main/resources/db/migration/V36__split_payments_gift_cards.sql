-- F17: Split payments + Gift cards
-- Gift card table (per empresa)
CREATE TABLE IF NOT EXISTS hot_click_gift_card_tb (
    id_gift_card        BIGSERIAL PRIMARY KEY,
    fk_id_empresa       BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    codigo              VARCHAR(30)  NOT NULL UNIQUE,
    saldo_inicial       INTEGER      NOT NULL,
    saldo_actual        INTEGER      NOT NULL,
    estado              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVA',
    fecha_vencimiento   DATE,
    fecha_creacion      TIMESTAMP    NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP
);

-- Split payment audit table (one row per payment method used in a pedido)
CREATE TABLE IF NOT EXISTS hot_click_split_pago_tb (
    id_split        BIGSERIAL PRIMARY KEY,
    fk_id_pedido    BIGINT       NOT NULL REFERENCES hot_click_pedido_tb(id_pedido),
    fk_id_gift_card BIGINT       REFERENCES hot_click_gift_card_tb(id_gift_card),
    tipo            VARCHAR(30)  NOT NULL,
    monto           INTEGER      NOT NULL,
    referencia      VARCHAR(200),
    fecha_pago      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Extra columns on pedido to track gift card usage across payment lifecycle
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS gift_card_codigo VARCHAR(30);
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS gift_card_monto  INTEGER DEFAULT 0;
