-- V243 (23-nov-2026): pedidos del COMPRADOR por Telegram (bot de la tienda). Aditiva e idempotente.
--  * sesion de comprador por chat (carrito/paso en JSON; NO es una cuenta del panel)
--  * ubicacion de entrega estructurada del pedido (fuente, enlace normalizado, lat/lng) sin tocar direccion_entrega
--  * token de retiro en tienda: opaco, de un solo uso, vence a las 4 h del pago confirmado
CREATE TABLE IF NOT EXISTS hot_click_telegram_comprador_sesion_tb (
    id_sesion          BIGSERIAL PRIMARY KEY,
    chat_id            BIGINT       NOT NULL,
    fk_id_empresa      BIGINT       NOT NULL REFERENCES hot_click_empresa_tb (id_empresa) ON DELETE CASCADE,
    paso               VARCHAR(30)  NOT NULL,
    contexto           TEXT,
    fk_id_pedido       BIGINT       REFERENCES hot_click_pedido_tb (id_pedido) ON DELETE SET NULL,
    fecha_creacion     TIMESTAMP    NOT NULL,
    ultima_actividad   TIMESTAMP    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tg_comprador_sesion_chat
    ON hot_click_telegram_comprador_sesion_tb (chat_id);
CREATE INDEX IF NOT EXISTS idx_tg_comprador_sesion_pedido
    ON hot_click_telegram_comprador_sesion_tb (fk_id_pedido);
CREATE INDEX IF NOT EXISTS idx_tg_comprador_sesion_actividad
    ON hot_click_telegram_comprador_sesion_tb (ultima_actividad);

CREATE TABLE IF NOT EXISTS hot_click_pedido_entrega_tb (
    id_entrega         BIGSERIAL PRIMARY KEY,
    fk_id_pedido       BIGINT       NOT NULL REFERENCES hot_click_pedido_tb (id_pedido) ON DELETE CASCADE,
    fuente             VARCHAR(20)  NOT NULL,
    direccion_texto    VARCHAR(500),
    url_normalizada    VARCHAR(500),
    lat                DOUBLE PRECISION,
    lng                DOUBLE PRECISION,
    fecha_creacion     TIMESTAMP    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pedido_entrega_pedido
    ON hot_click_pedido_entrega_tb (fk_id_pedido);

CREATE TABLE IF NOT EXISTS hot_click_pedido_retiro_token_tb (
    id_retiro_token    BIGSERIAL PRIMARY KEY,
    token              VARCHAR(64)  NOT NULL,
    fk_id_pedido       BIGINT       NOT NULL REFERENCES hot_click_pedido_tb (id_pedido) ON DELETE CASCADE,
    fk_id_empresa      BIGINT       NOT NULL REFERENCES hot_click_empresa_tb (id_empresa) ON DELETE CASCADE,
    estado             VARCHAR(15)  NOT NULL,
    expira             TIMESTAMP    NOT NULL,
    fecha_creacion     TIMESTAMP    NOT NULL,
    fecha_canje        TIMESTAMP,
    fk_id_usuario_canje BIGINT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pedido_retiro_token
    ON hot_click_pedido_retiro_token_tb (token);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pedido_retiro_token_pedido
    ON hot_click_pedido_retiro_token_tb (fk_id_pedido);
-- barrido de vencidos
CREATE INDEX IF NOT EXISTS idx_pedido_retiro_token_barrido
    ON hot_click_pedido_retiro_token_tb (estado, expira);
