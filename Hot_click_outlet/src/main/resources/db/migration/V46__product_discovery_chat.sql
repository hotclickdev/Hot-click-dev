-- F26: Public product discovery chat widget
-- Tags field for manual keyword assignment per product
ALTER TABLE hot_click_producto_tb ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';

-- Full-text search vector (Spanish) — generated from name + short desc + tags
-- Allows fast tsvector @@ tsquery search without Claude tokens
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('spanish',
            COALESCE(nombre_producto, '') || ' ' ||
            COALESCE(descripcion_corta, '') || ' ' ||
            COALESCE(tags, '')
        )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_producto_fts
    ON hot_click_producto_tb USING GIN(search_vector);
