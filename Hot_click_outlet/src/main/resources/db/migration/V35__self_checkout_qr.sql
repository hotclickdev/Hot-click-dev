-- V35: F16 Self-checkout + QR Ordering

-- ============================================================
-- Mesa / punto de autoservicio con código QR
-- Tipos: MESA | KIOSK | ESTANTE | MOSTRADOR | ZONA
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_mesa_tb (
    id_mesa         BIGSERIAL     PRIMARY KEY,
    fk_id_empresa   BIGINT        NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    nombre          VARCHAR(100)  NOT NULL,
    descripcion     VARCHAR(200),
    tipo            VARCHAR(20)   NOT NULL DEFAULT 'MESA',
    qr_token        VARCHAR(100)  UNIQUE NOT NULL,
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mesa_empresa ON hot_click_mesa_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_mesa_token   ON hot_click_mesa_tb (qr_token);

-- ============================================================
-- Campos de autoservicio en pedido
-- mesa_nombre   — nombre de la mesa que generó el pedido (desnormalizado para historial)
-- cliente_nombre — nombre del cliente ingresado en el autoservicio
-- cliente_tel   — teléfono opcional del cliente
-- ============================================================
ALTER TABLE hot_click_pedido_tb
    ADD COLUMN IF NOT EXISTS mesa_nombre    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cliente_tel    VARCHAR(30);
