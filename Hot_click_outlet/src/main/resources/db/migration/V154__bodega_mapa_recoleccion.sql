-- Pin de Google Maps en la bodega y copia en la solicitud de recolección.
ALTER TABLE hot_click_bodega_tb
    ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 8),
    ADD COLUMN IF NOT EXISTS longitud NUMERIC(11, 8);

ALTER TABLE hot_click_solicitud_recoleccion_tb
    ADD COLUMN IF NOT EXISTS fk_id_bodega BIGINT REFERENCES hot_click_bodega_tb(id_bodega) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 8),
    ADD COLUMN IF NOT EXISTS longitud NUMERIC(11, 8);
