-- ============================================================
-- V28: CRM — campos de fidelidad y segmentación en usuario
-- ============================================================

ALTER TABLE hot_click_usuario_tb
  ADD COLUMN IF NOT EXISTS puntos_fidelidad   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limite_credito     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_credito      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS segmento           VARCHAR(30),
  ADD COLUMN IF NOT EXISTS notas_internas     TEXT,
  ADD COLUMN IF NOT EXISTS total_compras_hist INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_pedidos_hist   INTEGER NOT NULL DEFAULT 0;

-- Segmentos posibles: NUEVO, FRECUENTE, VIP, INACTIVO
COMMENT ON COLUMN hot_click_usuario_tb.segmento IS
  'NUEVO = 0-1 pedidos | FRECUENTE = 2-9 | VIP = 10+ o >₡500k | INACTIVO = sin compras en 90 días';
