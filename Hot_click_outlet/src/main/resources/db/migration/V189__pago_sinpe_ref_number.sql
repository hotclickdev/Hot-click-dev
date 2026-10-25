-- SINPERefNumber de ONVO (25 caracteres) guardado tras confirmar el pago. Aditiva: columna nueva nullable.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS sinpe_ref_number VARCHAR(25);
