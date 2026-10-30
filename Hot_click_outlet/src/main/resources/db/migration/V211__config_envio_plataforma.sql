-- V211 (A-2, MED-3 Auditor 3): montos de envío de la plataforma configurables por ADMIN; antes fijos en
-- OrderPricingService. Fila única id=1. Aditiva: no toca tablas existentes.
CREATE TABLE IF NOT EXISTS hot_click_config_envio_tb (
    id BIGINT PRIMARY KEY,
    monto_gam_crc INTEGER NOT NULL DEFAULT 4000,
    monto_fuera_gam_crc INTEGER NOT NULL DEFAULT 5500,
    monto_rapido_crc INTEGER NOT NULL DEFAULT 5000,
    CONSTRAINT ck_config_envio_gam CHECK (monto_gam_crc BETWEEN 0 AND 50000),
    CONSTRAINT ck_config_envio_fuera_gam CHECK (monto_fuera_gam_crc BETWEEN 0 AND 50000),
    CONSTRAINT ck_config_envio_rapido CHECK (monto_rapido_crc BETWEEN 0 AND 50000)
);

INSERT INTO hot_click_config_envio_tb (id, monto_gam_crc, monto_fuera_gam_crc, monto_rapido_crc)
VALUES (1, 4000, 5500, 5000)
ON CONFLICT (id) DO NOTHING;
