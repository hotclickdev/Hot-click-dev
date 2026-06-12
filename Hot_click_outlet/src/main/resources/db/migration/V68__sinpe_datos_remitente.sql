-- Añade cédula, teléfono y correo del remitente al comprobante SINPE
ALTER TABLE hot_click_comprobante_sinpe_tb
    ADD COLUMN IF NOT EXISTS cedula_remitente   VARCHAR(20),
    ADD COLUMN IF NOT EXISTS telefono_remitente VARCHAR(20),
    ADD COLUMN IF NOT EXISTS correo_remitente   VARCHAR(150);
