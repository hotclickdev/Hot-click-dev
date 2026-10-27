-- M4: la sesión QR del POS guarda si el cliente pidió factura electrónica y el IVA incluido en el total.
-- Aditiva: columnas nuevas con default; las sesiones existentes quedan como tiquete sin IVA.
ALTER TABLE hot_click_pos_qr_sesion_tb ADD COLUMN IF NOT EXISTS factura_electronica BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hot_click_pos_qr_sesion_tb ADD COLUMN IF NOT EXISTS monto_impuesto INTEGER NOT NULL DEFAULT 0;
