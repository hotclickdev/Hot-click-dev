-- Mensualidades de plan cobradas con Tilopay (reemplaza ONVO en suscripciones). Una fila por intento de cobro.
CREATE TABLE IF NOT EXISTS hot_click_cobro_suscripcion_tb (
    id_cobro_suscripcion BIGSERIAL PRIMARY KEY,
    fk_id_empresa        BIGINT      NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_plan           BIGINT      NOT NULL,
    order_number         VARCHAR(60) NOT NULL UNIQUE,
    monto_crc            BIGINT      NOT NULL,
    estado               VARCHAR(12) NOT NULL DEFAULT 'PENDIENTE',
    motivo               VARCHAR(12) NOT NULL DEFAULT 'ALTA',
    autorizacion         VARCHAR(60),
    fecha_creacion       TIMESTAMP   NOT NULL DEFAULT now(),
    fecha_pago           TIMESTAMP,
    CONSTRAINT ck_cobro_sub_estado CHECK (estado IN ('PENDIENTE', 'PAGADO', 'FALLIDO', 'ANULADO')),
    CONSTRAINT ck_cobro_sub_motivo CHECK (motivo IN ('ALTA', 'RENOVACION'))
);
CREATE INDEX IF NOT EXISTS ix_cobro_sub_empresa ON hot_click_cobro_suscripcion_tb (fk_id_empresa, estado);

