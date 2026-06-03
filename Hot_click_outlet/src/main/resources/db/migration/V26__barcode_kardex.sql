-- ============================================================
-- V26: Barcode en producto + campos de trazabilidad en kardex
-- ============================================================

-- ── 1. Barcode en producto ───────────────────────────────────
-- SKU = código interno de la empresa.
-- Barcode = EAN-13 / UPC-A para lector de barras físico.
ALTER TABLE hot_click_producto_tb
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_producto_barcode
  ON hot_click_producto_tb (barcode)
  WHERE barcode IS NOT NULL;

-- ── 2. Trazabilidad extendida en movimientos de stock ────────
-- tipo           : categoría de alto nivel del movimiento
--                  (VENTA, VENTA_POS, COMPRA, AJUSTE_ENTRADA,
--                   AJUSTE_SALIDA, TRANSFERENCIA, DEVOLUCION)
-- referencia_id  : FK al pedido / compra / transferencia que originó el movimiento
-- referencia_tipo: tipo de la entidad referenciada (PEDIDO, COMPRA, TRANSFERENCIA)
ALTER TABLE hot_click_movimiento_stock_tb
  ADD COLUMN IF NOT EXISTS tipo             VARCHAR(30) DEFAULT 'VENTA',
  ADD COLUMN IF NOT EXISTS referencia_id    BIGINT,
  ADD COLUMN IF NOT EXISTS referencia_tipo  VARCHAR(30);
