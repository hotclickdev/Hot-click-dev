-- Area 6: persistir TODOS los tokens de Claude (entrada, salida y cache) por empresa y mes.
-- Anthropic factura aparte cache_read_input_tokens y cache_creation_input_tokens; sin estas
-- columnas el costo del panel admin queda subestimado cuando se active el prompt caching.
ALTER TABLE hot_click_ai_uso_tb
    ADD COLUMN IF NOT EXISTS tokens_cache_lectura   BIGINT NOT NULL DEFAULT 0;
ALTER TABLE hot_click_ai_uso_tb
    ADD COLUMN IF NOT EXISTS tokens_cache_escritura BIGINT NOT NULL DEFAULT 0;
