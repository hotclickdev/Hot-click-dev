-- ============================================================
-- V25: POS base — origen en pedido, turno de caja, cliente mostrador
-- ============================================================

-- ── 1. Usuario sistema "Cliente Mostrador" para ventas POS anónimas ──
-- fk_id_usuario_final es NOT NULL en pedido, así que las ventas sin
-- cliente identificado se asignan a este usuario especial (nunca puede
-- iniciar sesión porque su hash no corresponde a ninguna contraseña real).
INSERT INTO hot_click_usuario_tb (
  id_usuario,
  identificacion,
  nombre,
  apellido_paterno,
  correo,
  telefono,
  contrasena_hash,
  fk_id_estado
) VALUES (
  999,
  'SISTEMA-POS-999',
  'Cliente',
  'Mostrador',
  'mostrador@hotclick.internal',
  '00000000',
  '$2a$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  1
) ON CONFLICT (id_usuario) DO NOTHING;

-- Asignar rol USUARIO_FINAL al cliente mostrador
INSERT INTO hot_click_usuario_rol_tb (fk_id_usuario, fk_id_rol)
VALUES (999, 3)
ON CONFLICT DO NOTHING;

-- Avanzar la secuencia de usuario para que futuros registros reales
-- no colisionen con el id=999 reservado
SELECT setval(
  pg_get_serial_sequence('hot_click_usuario_tb', 'id_usuario'),
  GREATEST((SELECT MAX(id_usuario) FROM hot_click_usuario_tb) + 1, 1000)
);

-- ── 2. Campo origen en pedido ────────────────────────────────
-- ONLINE  = compra desde ecommerce (default para registros existentes)
-- POS     = venta desde caja registradora
-- MANUAL  = pedido creado manualmente desde AdminOrders
ALTER TABLE hot_click_pedido_tb
  ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'ONLINE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_pedido_origen'
      AND conrelid = 'hot_click_pedido_tb'::regclass
  ) THEN
    ALTER TABLE hot_click_pedido_tb
      ADD CONSTRAINT chk_pedido_origen
      CHECK (origen IN ('ONLINE','POS','MANUAL')) NOT VALID;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_pedido_origen
  ON hot_click_pedido_tb (origen);

-- ── 3. Tabla turno de caja ───────────────────────────────────
CREATE TABLE IF NOT EXISTS hot_click_turno_caja_tb (
  id_turno              BIGSERIAL    PRIMARY KEY,
  fk_id_usuario         BIGINT       NOT NULL REFERENCES hot_click_usuario_tb(id_usuario),
  fk_id_empresa         BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
  fecha_apertura        TIMESTAMP    NOT NULL DEFAULT NOW(),
  fecha_cierre          TIMESTAMP,
  monto_inicial         INTEGER      NOT NULL DEFAULT 0,
  monto_declarado       INTEGER,
  monto_calculado       INTEGER,
  diferencia            INTEGER,
  notas                 TEXT,
  estado                VARCHAR(20)  NOT NULL DEFAULT 'ABIERTO',
  total_efectivo        INTEGER      NOT NULL DEFAULT 0,
  total_sinpe           INTEGER      NOT NULL DEFAULT 0,
  total_tarjeta         INTEGER      NOT NULL DEFAULT 0,
  total_transferencia   INTEGER      NOT NULL DEFAULT 0,
  num_transacciones     INTEGER      NOT NULL DEFAULT 0,
  CONSTRAINT chk_turno_estado CHECK (estado IN ('ABIERTO','CERRADO'))
);

CREATE INDEX IF NOT EXISTS idx_turno_empresa ON hot_click_turno_caja_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_turno_usuario ON hot_click_turno_caja_tb (fk_id_usuario);
CREATE INDEX IF NOT EXISTS idx_turno_estado  ON hot_click_turno_caja_tb (estado)
  WHERE estado = 'ABIERTO';
