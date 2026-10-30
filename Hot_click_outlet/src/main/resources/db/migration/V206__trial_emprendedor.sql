-- Trial del plan Emprendedor (primeros N negocios, N y días configurables por propiedades; 70 y 90 por defecto).
-- Aditiva: solo agrega columnas NULL e índice; no toca filas existentes. Los negocios que ya tomaron un puesto
-- gratis antes (V127, ACTIVO) quedan como están: estas columnas quedan en NULL.
-- trial_emprendedor_pos es UNIQUE: segunda defensa (además del UPDATE condicionado del contador) contra que dos
-- negocios compartan puesto bajo altas simultáneas.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS trial_emprendedor_hasta DATE;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS trial_emprendedor_pos INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS uq_empresa_trial_emprendedor_pos
    ON hot_click_empresa_tb (trial_emprendedor_pos);
CREATE INDEX IF NOT EXISTS idx_empresa_trial_emprendedor_hasta
    ON hot_click_empresa_tb (trial_emprendedor_hasta) WHERE trial_emprendedor_hasta IS NOT NULL;
