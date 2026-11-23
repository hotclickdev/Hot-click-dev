-- V244 (23-nov-2026): alta de negocios por fases (registro -> productos -> ONVO -> revision HotClick -> publicada).
-- Aditiva e idempotente. NO despublica nada: los negocios existentes quedan alta_por_fases=FALSE (legacy) y
-- venta_online_habilitada=TRUE, o sea exactamente como estaban.
--  * alta_por_fases: TRUE solo para negocios registrados despues del deploy (los marca el codigo, no esta migracion).
--  * venta_online_habilitada: predicado unico de "puede publicarse y cobrar en linea". Lo mantiene AltaFasesService.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS alta_por_fases BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS venta_online_habilitada BOOLEAN NOT NULL DEFAULT TRUE;

-- Seguimiento de la cuenta conectada ONVO (avisos idempotentes; ver AltaFasesAvisoService).
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS activada_en TIMESTAMP;
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS revision_aviso_en TIMESTAMP;
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS perdida_desde TIMESTAMP;
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS avisos_perdida INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS ultimo_aviso_perdida_en TIMESTAMP;
ALTER TABLE hot_click_empresa_cuenta_onvo_tb ADD COLUMN IF NOT EXISTS recuperada_aviso_pendiente BOOLEAN NOT NULL DEFAULT FALSE;

-- Cuentas que hoy ya estan ACTIVAS: se anota desde cuando (no se avisa nada al admin por ellas).
UPDATE hot_click_empresa_cuenta_onvo_tb
   SET activada_en = COALESCE(activada_en, actualizado_en), revision_aviso_en = COALESCE(revision_aviso_en, actualizado_en)
 WHERE estado = 'ACTIVA' AND activada_en IS NULL;

CREATE INDEX IF NOT EXISTS ix_empresa_cuenta_onvo_perdida
    ON hot_click_empresa_cuenta_onvo_tb (perdida_desde) WHERE perdida_desde IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_empresa_alta_por_fases
    ON hot_click_empresa_tb (alta_por_fases) WHERE alta_por_fases = TRUE;
