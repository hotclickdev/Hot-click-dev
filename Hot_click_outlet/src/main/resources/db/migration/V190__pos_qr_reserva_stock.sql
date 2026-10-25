-- ALTO 2: reserva de stock al generar el QR del POS y marca de reembolso pendiente. Aditiva: columnas nuevas.
ALTER TABLE hot_click_pos_qr_sesion_tb ADD COLUMN IF NOT EXISTS stock_reservado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hot_click_pos_qr_sesion_tb ADD COLUMN IF NOT EXISTS reserva_expira TIMESTAMP;
ALTER TABLE hot_click_pos_qr_sesion_tb ADD COLUMN IF NOT EXISTS reembolso_pendiente BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS ix_pos_qr_sesion_stock_reservado ON hot_click_pos_qr_sesion_tb (stock_reservado);
