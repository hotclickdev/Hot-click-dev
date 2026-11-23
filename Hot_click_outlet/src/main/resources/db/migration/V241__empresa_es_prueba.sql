-- Marca de tienda interna de prueba: se excluye de sitemap, directorio y vitrinas publicas.
-- Default FALSE: las tiendas reales no cambian. Las tiendas de prueba ya publicadas se marcan
-- es_prueba = TRUE directamente en la base (operacion; no se listan slugs en el repo).
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS es_prueba BOOLEAN NOT NULL DEFAULT FALSE;
