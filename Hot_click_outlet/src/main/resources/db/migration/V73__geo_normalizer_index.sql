-- V73: Normalización geográfica para Buy Box
-- Permite comparar provincia/canton sin importar tildes o mayúsculas.

-- 1. Extensión unaccent (disponible por defecto en Supabase PostgreSQL)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Wrapper IMMUTABLE requerido para crear índices funcionales.
--    La función unaccent nativa es STABLE, no IMMUTABLE, lo que impide
--    usarla directamente en un índice de expresión.
-- Supabase instala las extensiones nuevas en el esquema "extensions" (no en
-- "public"), así que unaccent() no resuelve con el search_path por defecto.
-- SET search_path en la función la hace funcionar sin importar en qué
-- esquema haya quedado la extensión.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT unaccent($1)
$$ LANGUAGE sql IMMUTABLE STRICT
SET search_path = public, extensions;

-- 2b. Columnas de ubicación geográfica en bodega — deben existir antes de
--     normalizarlas más abajo. (V74 también las necesita; se crean aquí
--     porque este script corre primero por orden de versión).
ALTER TABLE hot_click_bodega_tb
    ADD COLUMN IF NOT EXISTS provincia VARCHAR(50),
    ADD COLUMN IF NOT EXISTS canton    VARCHAR(100);

-- 3. Normalizar datos ya existentes en bodega a UPPER sin acentos,
--    para que coincidan con los parámetros que envía el backend Java.
UPDATE hot_click_bodega_tb
SET
    provincia = UPPER(immutable_unaccent(provincia)),
    canton    = UPPER(immutable_unaccent(canton))
WHERE provincia IS NOT NULL
   OR canton    IS NOT NULL;

-- 4. Reemplazar el índice básico por uno funcional normalizado.
--    Esto permite al planner usar index scan si en el futuro se agrega
--    un WHERE UPPER(immutable_unaccent(b.provincia)) = :prov.
DROP INDEX IF EXISTS idx_bodega_geo;

CREATE INDEX IF NOT EXISTS idx_bodega_geo_norm
    ON hot_click_bodega_tb (
        UPPER(immutable_unaccent(provincia)),
        UPPER(immutable_unaccent(canton))
    )
    WHERE provincia IS NOT NULL;
