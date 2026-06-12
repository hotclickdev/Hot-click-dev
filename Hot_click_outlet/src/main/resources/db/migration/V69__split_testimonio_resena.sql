-- V69: Divide testimonios en dos tipos:
--   TESTIMONIO — comentario general sobre la web/servicio
--   RESENA     — reseña de un producto comprado (max 3 por usuario por producto)

-- 1. Quitar el UNIQUE que solo permitía 1 reseña por usuario+producto
ALTER TABLE hot_click_testimonio_tb
    DROP CONSTRAINT IF EXISTS uq_testimonio_usuario_producto;

-- 2. Agregar columna tipo
ALTER TABLE hot_click_testimonio_tb
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'RESENA';

-- 3. Constraint de valores válidos (idempotente)
ALTER TABLE hot_click_testimonio_tb
    DROP CONSTRAINT IF EXISTS chk_testimonio_tipo;

ALTER TABLE hot_click_testimonio_tb
    ADD CONSTRAINT chk_testimonio_tipo CHECK (tipo IN ('TESTIMONIO', 'RESENA'));

-- 4. Índice de soporte para el conteo de reseñas por usuario+producto
CREATE INDEX IF NOT EXISTS idx_testimonio_usuario_producto_tipo
    ON hot_click_testimonio_tb (fk_id_usuario, fk_id_producto, tipo);
