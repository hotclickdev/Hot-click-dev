-- V117: extras de negocio en perfil empresa (categoría, Instagram, zona de envío)
ALTER TABLE hot_click_empresa_tb
    ADD COLUMN IF NOT EXISTS categoria_negocio VARCHAR(100),
    ADD COLUMN IF NOT EXISTS instagram         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS zona_envio        VARCHAR(100);
