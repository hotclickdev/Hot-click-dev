-- Contra entrega por negocio (S2). Aditiva.
-- acepta_contra_entrega TRUE para las filas existentes: mantiene el comportamiento actual (manda la config global).
-- contra_entrega_minimo_crc NULL = sin mínimo. El monto lo pone cada negocio; HotClick no fija ninguno.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS acepta_contra_entrega BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS contra_entrega_minimo_crc INTEGER;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_empresa_contra_entrega_minimo') THEN
    ALTER TABLE hot_click_empresa_tb ADD CONSTRAINT chk_empresa_contra_entrega_minimo
      CHECK (contra_entrega_minimo_crc IS NULL OR contra_entrega_minimo_crc > 0);
  END IF;
END $$;
