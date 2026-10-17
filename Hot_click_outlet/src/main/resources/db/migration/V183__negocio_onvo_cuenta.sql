-- S3-06 / S3-11: cuentas conectadas de pasarela por negocio. Aditiva e idempotente.
-- No guarda onboardingUrl, IBAN ni datos de KYC (son de ONVO).
-- Reversa (manual, solo si nunca se usó): DROP TABLE hot_click_negocio_onvo_cuenta_tb;
CREATE TABLE IF NOT EXISTS hot_click_negocio_onvo_cuenta_tb (
    id_cuenta                BIGSERIAL PRIMARY KEY,
    fk_id_empresa            BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    proveedor                VARCHAR(20)  NOT NULL DEFAULT 'ONVO',
    modo                     VARCHAR(10)  NOT NULL,
    onvo_account_id          VARCHAR(80),
    estado                   VARCHAR(30)  NOT NULL DEFAULT 'SIN_CUENTA',
    pct_comision             NUMERIC(5,2),
    tarifa_semanal_crc       INTEGER,
    frecuencia_liquidacion   VARCHAR(12),
    frecuencia_pendiente     VARCHAR(12),
    cobros_onvo_activos      BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_creacion           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_por          BIGINT,
    CONSTRAINT chk_onvo_cuenta_modo CHECK (modo IN ('TEST', 'LIVE')),
    CONSTRAINT chk_onvo_cuenta_frecuencia CHECK (frecuencia_liquidacion IS NULL OR frecuencia_liquidacion IN ('QUINCENAL', 'MENSUAL')),
    CONSTRAINT chk_onvo_cuenta_frecuencia_pend CHECK (frecuencia_pendiente IS NULL OR frecuencia_pendiente IN ('QUINCENAL', 'MENSUAL'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_onvo_cuenta_empresa_proveedor_modo
    ON hot_click_negocio_onvo_cuenta_tb (fk_id_empresa, proveedor, modo);

-- Motivo y fecha de la pausa de cobros por HotClick (#154): se muestran al negocio y quedan en la auditoría.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS cobros_pausa_motivo VARCHAR(300);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS cobros_pausados_el TIMESTAMPTZ;

-- Frecuencia de pago sin valor por defecto (decisión del dueño, 16-oct): nadie queda en QUINCENAL sin elegirlo.
-- No toca filas existentes. Se quita también el NOT NULL para que un alta sin frecuencia quede en NULL
-- ("sin elegir") en vez de fallar; el CHECK de V168 sigue validando QUINCENAL/MENSUAL cuando hay valor.
-- Reversa (manual): ALTER TABLE hot_click_empresa_tb ALTER COLUMN frecuencia_payout SET DEFAULT 'QUINCENAL';
ALTER TABLE hot_click_empresa_tb ALTER COLUMN frecuencia_payout DROP DEFAULT;
ALTER TABLE hot_click_empresa_tb ALTER COLUMN frecuencia_payout DROP NOT NULL;
