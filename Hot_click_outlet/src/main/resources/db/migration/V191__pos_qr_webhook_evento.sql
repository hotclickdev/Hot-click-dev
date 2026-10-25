-- Idempotencia del webhook ONVO del POS por eventId. Aditiva: columna nueva nullable + índice único.
ALTER TABLE hot_click_pos_qr_sesion_tb ADD COLUMN IF NOT EXISTS onvo_evento_id VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_qr_sesion_onvo_evento ON hot_click_pos_qr_sesion_tb (onvo_evento_id);
