-- V159: el enlace de la tienda rápida pasa a ser de un solo uso, con vencimiento propio,
-- guardado como hash, revocable, con la aceptación de responsabilidad y el avance del onboarding.
-- Extiende hot_click_tienda_rapida_tb (V157); no crea tablas nuevas.

ALTER TABLE hot_click_tienda_rapida_tb ALTER COLUMN token DROP NOT NULL;

ALTER TABLE hot_click_tienda_rapida_tb ADD COLUMN IF NOT EXISTS token_hash      VARCHAR(64);
ALTER TABLE hot_click_tienda_rapida_tb ADD COLUMN IF NOT EXISTS enlace_vence    TIMESTAMP;
ALTER TABLE hot_click_tienda_rapida_tb ADD COLUMN IF NOT EXISTS usado_en        TIMESTAMP;
ALTER TABLE hot_click_tienda_rapida_tb ADD COLUMN IF NOT EXISTS revocado_en     TIMESTAMP;
ALTER TABLE hot_click_tienda_rapida_tb ADD COLUMN IF NOT EXISTS creado_por      BIGINT REFERENCES hot_click_usuario_tb(id_usuario);
ALTER TABLE hot_click_tienda_rapida_tb ADD COLUMN IF NOT EXISTS aceptado_en     TIMESTAMP;
ALTER TABLE hot_click_tienda_rapida_tb ADD COLUMN IF NOT EXISTS aceptado_ip_hash VARCHAR(64);
ALTER TABLE hot_click_tienda_rapida_tb ADD COLUMN IF NOT EXISTS aceptado_por    BIGINT REFERENCES hot_click_usuario_tb(id_usuario);
ALTER TABLE hot_click_tienda_rapida_tb ADD COLUMN IF NOT EXISTS version_legal   VARCHAR(20);
ALTER TABLE hot_click_tienda_rapida_tb ADD COLUMN IF NOT EXISTS onboarding_hechos VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tienda_rapida_token_hash
    ON hot_click_tienda_rapida_tb (token_hash);
