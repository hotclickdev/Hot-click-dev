-- Tenant isolation: Carrito y Cupon no tenían fk_id_empresa, lo que permitía
-- fuga de datos entre empresas (auditoría de seguridad 2026-06-15).

-- ─── CARRITO ────────────────────────────────────────────────────────────────
ALTER TABLE hot_click_carrito_tb
    ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT;

-- Backfill: heredar la empresa del usuario propietario del carrito
UPDATE hot_click_carrito_tb c
SET fk_id_empresa = u.fk_id_empresa
FROM hot_click_usuario_tb u
WHERE u.id_usuario = c.fk_id_usuario_final
  AND c.fk_id_empresa IS NULL
  AND u.fk_id_empresa IS NOT NULL;

ALTER TABLE hot_click_carrito_tb
    DROP CONSTRAINT IF EXISTS fk_carrito_empresa;

ALTER TABLE hot_click_carrito_tb
    ADD CONSTRAINT fk_carrito_empresa
    FOREIGN KEY (fk_id_empresa) REFERENCES hot_click_empresa_tb(id_empresa)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_carrito_tenant
    ON hot_click_carrito_tb(fk_id_empresa);

-- ─── CUPON ──────────────────────────────────────────────────────────────────
ALTER TABLE hot_click_cupon_tb
    ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT;

-- El unique global en "codigo" impedía que dos empresas tuvieran el mismo
-- código de cupón. Se reemplaza por un unique compuesto (codigo, empresa).
ALTER TABLE hot_click_cupon_tb
    DROP CONSTRAINT IF EXISTS hot_click_cupon_tb_codigo_key;

ALTER TABLE hot_click_cupon_tb
    DROP CONSTRAINT IF EXISTS fk_cupon_empresa;

ALTER TABLE hot_click_cupon_tb
    ADD CONSTRAINT fk_cupon_empresa
    FOREIGN KEY (fk_id_empresa) REFERENCES hot_click_empresa_tb(id_empresa)
    ON DELETE CASCADE;

ALTER TABLE hot_click_cupon_tb
    DROP CONSTRAINT IF EXISTS uq_cupon_codigo_empresa;

-- NULLS NOT DISTINCT: los cupones globales preexistentes (fk_id_empresa NULL)
-- siguen siendo únicos por código entre sí, igual que los de cada empresa.
ALTER TABLE hot_click_cupon_tb
    ADD CONSTRAINT uq_cupon_codigo_empresa
    UNIQUE NULLS NOT DISTINCT (codigo, fk_id_empresa);

CREATE INDEX IF NOT EXISTS idx_cupon_tenant
    ON hot_click_cupon_tb(fk_id_empresa);
