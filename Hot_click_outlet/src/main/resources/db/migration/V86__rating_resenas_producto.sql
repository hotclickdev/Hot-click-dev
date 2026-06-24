-- V86: Calificación promedio y total de reseñas por producto.
-- rating_promedio: 0.00 a 5.00, dos decimales.
-- total_resenas: cantidad de reseñas que componen el promedio.
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS rating_promedio NUMERIC(3,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_resenas   INTEGER      DEFAULT 0;
