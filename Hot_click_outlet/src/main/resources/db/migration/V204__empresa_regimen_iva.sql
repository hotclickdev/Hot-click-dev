-- M4 (auditoría 7): régimen de IVA por tienda. Aditiva: columna nueva con default.
-- SIMPLIFICADO (default): el precio de venta no incluye IVA; la factura electrónica suma el 13 %.
-- TRADICIONAL: el precio de venta ya incluye IVA.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS regimen_iva VARCHAR(20) NOT NULL DEFAULT 'SIMPLIFICADO';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_empresa_regimen_iva') THEN
        ALTER TABLE hot_click_empresa_tb ADD CONSTRAINT ck_empresa_regimen_iva
            CHECK (regimen_iva IN ('SIMPLIFICADO', 'TRADICIONAL'));
    END IF;
END $$;
