-- AG-07 / AG-09: enlace de compra que envian los bots de IA (hotclick.lat/c/<codigo>).
-- Aditiva e idempotente: tablas nuevas, no toca datos existentes.
-- fk_id_chat_sesion queda SIN llave foranea: la tabla de conversaciones del agente la crea otra historia.
-- Retencion: DataRetentionScheduler borra enlaces con vence anterior a 90 dias (items en cascada).
CREATE TABLE IF NOT EXISTS hot_click_enlace_compra_tb (
    id_enlace_compra       BIGSERIAL PRIMARY KEY,
    codigo                 VARCHAR(64)  NOT NULL,
    fk_id_empresa          BIGINT       REFERENCES hot_click_empresa_tb (id_empresa) ON DELETE SET NULL,
    fk_id_chat_sesion      BIGINT,
    contacto_externo       VARCHAR(100),
    nombre_cliente         VARCHAR(120),
    canal                  VARCHAR(20)  NOT NULL,
    estado                 VARCHAR(15)  NOT NULL DEFAULT 'CREADO',
    fk_id_pedido           BIGINT       REFERENCES hot_click_pedido_tb (id_pedido) ON DELETE SET NULL,
    precio_total_creado    INTEGER      NOT NULL,
    creado                 TIMESTAMP    NOT NULL,
    abierto                TIMESTAMP,
    vence                  TIMESTAMP    NOT NULL,
    reserva_hasta          TIMESTAMP,
    recordatorios_enviados INTEGER      NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_enlace_compra_codigo ON hot_click_enlace_compra_tb (codigo);
CREATE INDEX IF NOT EXISTS idx_enlace_compra_barrido ON hot_click_enlace_compra_tb (estado, vence);
CREATE INDEX IF NOT EXISTS idx_enlace_compra_pedido ON hot_click_enlace_compra_tb (fk_id_pedido);

CREATE TABLE IF NOT EXISTS hot_click_enlace_compra_item_tb (
    id_enlace_compra_item  BIGSERIAL PRIMARY KEY,
    fk_id_enlace_compra    BIGINT  NOT NULL REFERENCES hot_click_enlace_compra_tb (id_enlace_compra) ON DELETE CASCADE,
    fk_id_producto         BIGINT  NOT NULL REFERENCES hot_click_producto_tb (id_producto) ON DELETE CASCADE,
    cantidad               INTEGER NOT NULL,
    precio_unitario_creado INTEGER NOT NULL,
    cantidad_reservada     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_enlace_compra_item_enlace ON hot_click_enlace_compra_item_tb (fk_id_enlace_compra);
