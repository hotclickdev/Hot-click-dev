-- ============================================================
-- V27: Proveedores y Órdenes de Compra
-- ============================================================

-- ── 1. Proveedores ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hot_click_proveedor_tb (
  id_proveedor  BIGSERIAL    PRIMARY KEY,
  nombre        VARCHAR(200) NOT NULL,
  contacto      VARCHAR(100),
  telefono      VARCHAR(30),
  correo        VARCHAR(150),
  notas         TEXT,
  fk_id_empresa BIGINT       REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_estado  INTEGER      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_proveedor_empresa ON hot_click_proveedor_tb (fk_id_empresa);

-- ── 2. Órdenes de compra ────────────────────────────────────
-- Estado: PENDIENTE → PARCIAL → RECIBIDA | CANCELADA
CREATE TABLE IF NOT EXISTS hot_click_orden_compra_tb (
  id_orden        BIGSERIAL    PRIMARY KEY,
  numero_orden    VARCHAR(20)  UNIQUE NOT NULL,
  fk_id_proveedor BIGINT       REFERENCES hot_click_proveedor_tb(id_proveedor),
  fk_id_empresa   BIGINT       REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_usuario   BIGINT       REFERENCES hot_click_usuario_tb(id_usuario),
  fecha_orden     TIMESTAMP    NOT NULL DEFAULT NOW(),
  fecha_recepcion TIMESTAMP,
  estado          VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
  total           INTEGER      NOT NULL DEFAULT 0,
  notas           TEXT,
  CONSTRAINT chk_orden_estado CHECK (estado IN ('PENDIENTE','PARCIAL','RECIBIDA','CANCELADA'))
);

CREATE INDEX IF NOT EXISTS idx_orden_empresa ON hot_click_orden_compra_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_orden_estado  ON hot_click_orden_compra_tb (estado);

-- ── 3. Ítems de orden de compra ─────────────────────────────
CREATE TABLE IF NOT EXISTS hot_click_orden_compra_item_tb (
  id_item           BIGSERIAL PRIMARY KEY,
  fk_id_orden       BIGINT    NOT NULL REFERENCES hot_click_orden_compra_tb(id_orden) ON DELETE CASCADE,
  fk_id_producto    BIGINT    NOT NULL REFERENCES hot_click_producto_tb(id_producto),
  cantidad          INTEGER   NOT NULL,
  precio_unitario   INTEGER   NOT NULL,
  cantidad_recibida INTEGER   NOT NULL DEFAULT 0
);
