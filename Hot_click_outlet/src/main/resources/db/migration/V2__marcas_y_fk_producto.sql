-- ============================================================
-- V2: Marcas, FK en producto, y testimonio con producto
-- Se aplica automáticamente en el despliegue en Render.
-- Todos los statements son idempotentes (IF NOT EXISTS).
-- ============================================================

-- ── Tabla de marcas ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hot_click_marca_tb (
    id_marca             SERIAL PRIMARY KEY,
    nombre_marca         VARCHAR(100) UNIQUE NOT NULL,
    logo_url             VARCHAR(500),
    fk_id_admin_cliente  INTEGER NOT NULL,
    fk_id_estado         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_marca_estado
    ON hot_click_marca_tb (fk_id_estado);

-- ── FK en producto hacia marca ────────────────────────────────
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS fk_id_marca INTEGER;

-- ── Testimonio: FK a producto y restricción única ─────────────
CREATE TABLE IF NOT EXISTS hot_click_testimonio_tb (
    id_testimonio    SERIAL PRIMARY KEY,
    fk_id_usuario    INTEGER REFERENCES hot_click_usuario_tb(id_usuario),
    fk_id_producto   INTEGER REFERENCES hot_click_producto_tb(id_producto),
    comentario       TEXT NOT NULL,
    imagen_url       VARCHAR(500),
    estado           VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion TIMESTAMP
);

ALTER TABLE hot_click_testimonio_tb
    ADD COLUMN IF NOT EXISTS fk_id_producto INTEGER REFERENCES hot_click_producto_tb(id_producto);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name    = 'hot_click_testimonio_tb'
          AND constraint_name = 'uq_testimonio_usuario_producto'
    ) THEN
        ALTER TABLE hot_click_testimonio_tb
            ADD CONSTRAINT uq_testimonio_usuario_producto
            UNIQUE (fk_id_usuario, fk_id_producto);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_testimonio_estado
    ON hot_click_testimonio_tb (estado);

CREATE INDEX IF NOT EXISTS idx_testimonio_usuario
    ON hot_click_testimonio_tb (fk_id_usuario);

CREATE INDEX IF NOT EXISTS idx_testimonio_producto
    ON hot_click_testimonio_tb (fk_id_producto);
