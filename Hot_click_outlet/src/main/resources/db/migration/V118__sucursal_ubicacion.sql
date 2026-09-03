-- V118: ubicación / dirección de sucursal (Negocio Plus)
ALTER TABLE hot_click_sucursal_tb
    ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(255);
