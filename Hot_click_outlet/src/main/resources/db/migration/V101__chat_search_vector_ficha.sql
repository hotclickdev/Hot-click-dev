-- Chat de descubrimiento: indexar ficha completa (desc larga, specs, cómo usar)
-- para que "productos para sala" no dependa solo de tags opcionales.
-- Recrear la columna generada: ADD COLUMN IF NOT EXISTS no cambia la expresión.

DROP INDEX IF EXISTS idx_producto_fts;

ALTER TABLE hot_click_producto_tb DROP COLUMN IF EXISTS search_vector;

ALTER TABLE hot_click_producto_tb
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('spanish',
            COALESCE(nombre_producto, '') || ' ' ||
            COALESCE(descripcion_corta, '') || ' ' ||
            COALESCE(left(descripcion_larga, 2000), '') || ' ' ||
            COALESCE(tags, '') || ' ' ||
            COALESCE(left(especificaciones, 1500), '') || ' ' ||
            COALESCE(left(como_usar, 800), '')
        )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_producto_fts
    ON hot_click_producto_tb USING GIN(search_vector);
