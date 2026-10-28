-- V209: tokens_entrada / tokens_salida de hot_click_ai_uso_tb pasan a BIGINT.
-- Acumulan el mes completo por empresa (y la empresa plataforma suma todo el tráfico sin tenant):
-- INTEGER desborda en ~2.1 mil millones de tokens. Ampliar INTEGER -> BIGINT no pierde datos.
-- Las columnas de caché (V201) ya son BIGINT.
ALTER TABLE hot_click_ai_uso_tb ALTER COLUMN tokens_entrada TYPE BIGINT;
ALTER TABLE hot_click_ai_uso_tb ALTER COLUMN tokens_salida TYPE BIGINT;
