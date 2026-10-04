-- Slug estable para landings /comprar/{slug}. Idempotente.
ALTER TABLE hot_click_categoria_tb
  ADD COLUMN IF NOT EXISTS slug VARCHAR(120);

WITH normalizado AS (
  SELECT id_categoria,
         NULLIF(
           trim(both '-' from regexp_replace(
             translate(lower(nombre_categoria),
               'áéíóúüñàèìòùäëïöâêîôûãõçÁÉÍÓÚÜÑ',
               'aeiouunaeiouaeioaeiouaocaeiouun'),
             '[^a-z0-9]+', '-', 'g')),
           '') AS base
  FROM hot_click_categoria_tb
),
con_base AS (
  SELECT id_categoria, COALESCE(base, 'categoria') AS base
  FROM normalizado
),
numerado AS (
  SELECT id_categoria, base,
         row_number() OVER (PARTITION BY base ORDER BY id_categoria) AS n
  FROM con_base
)
UPDATE hot_click_categoria_tb c
SET slug = CASE
  WHEN n.n = 1 THEN left(n.base, 120)
  ELSE left(n.base, 100) || '-c' || n.id_categoria
END
FROM numerado n
WHERE c.id_categoria = n.id_categoria
  AND (c.slug IS NULL OR trim(c.slug) = '');

CREATE UNIQUE INDEX IF NOT EXISTS uq_categoria_slug
  ON hot_click_categoria_tb (slug);
