-- Auditoría 7 (Hacienda). Migración aditiva.

-- 1) El XSD oficial 4.4 exige Emisor/Ubicacion. Columnas nullable: si faltan,
--    el comprobante queda PENDIENTE_CONFIG y no se envía.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS ubicacion_provincia   VARCHAR(1);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS ubicacion_canton      VARCHAR(2);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS ubicacion_distrito    VARCHAR(2);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS ubicacion_otras_senas VARCHAR(250);

-- 2) Un solo comprobante activo por pedido (ERROR y PENDIENTE_CONFIG cuentan como activos).
--    Si ya hay duplicados históricos, no se crea el índice y queda un NOTICE para revisarlos a mano.
DO $$
BEGIN
    IF EXISTS (
        SELECT fk_id_pedido
          FROM hot_click_comprobante_fiscal_tb
         WHERE fk_id_pedido IS NOT NULL
           AND estado IN ('PENDIENTE', 'PENDIENTE_CONFIG', 'ENVIADO', 'ACEPTADO', 'ERROR')
         GROUP BY fk_id_pedido
        HAVING COUNT(*) > 1
    ) THEN
        RAISE NOTICE 'V194: hay pedidos con más de un comprobante activo; no se crea ux_comprobante_activo_pedido';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS ux_comprobante_activo_pedido
            ON hot_click_comprobante_fiscal_tb (fk_id_pedido)
         WHERE fk_id_pedido IS NOT NULL
           AND estado IN ('PENDIENTE', 'PENDIENTE_CONFIG', 'ENVIADO', 'ACEPTADO', 'ERROR');
    END IF;
END $$;
