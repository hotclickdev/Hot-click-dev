-- V72: Agrega bodega designada para ventas online por tienda pública (slug)
-- Cada empresa puede designar cuál bodega recibe los pedidos del catálogo público.
-- Si es NULL, el StorefrontController usa la primera bodega activa de la empresa.
ALTER TABLE hot_click_empresa_tb
    ADD COLUMN IF NOT EXISTS fk_id_bodega_venta_online BIGINT
        REFERENCES hot_click_bodega_tb(id_bodega) ON DELETE SET NULL;

-- Índice para consulta rápida en StorefrontController
CREATE INDEX IF NOT EXISTS idx_empresa_bodega_online
    ON hot_click_empresa_tb(fk_id_bodega_venta_online)
    WHERE fk_id_bodega_venta_online IS NOT NULL;
