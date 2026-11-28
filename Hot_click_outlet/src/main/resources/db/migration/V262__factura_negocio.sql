-- V262 (Fase 2 fiscal): factura que cada negocio le emite a HotClick por cada quincena, y el interruptor
-- del mensaje receptor (aceptación). Aditiva e idempotente: no borra ni reescribe datos existentes.
-- Estados: PENDIENTE | RECIBIDA | ACEPTADA | RECHAZADA | VENCIDA | NO_APLICA (validado en la base y en la aplicación).
-- Sin llave foránea a la empresa: la factura es un documento fiscal y debe sobrevivir a la cuenta del negocio.
CREATE TABLE IF NOT EXISTS hot_click_factura_negocio_tb (
    id_factura_negocio BIGSERIAL PRIMARY KEY,
    fk_id_empresa BIGINT NOT NULL,
    periodo_desde DATE NOT NULL,
    periodo_hasta DATE NOT NULL,
    monto_crc BIGINT NOT NULL DEFAULT 0,
    fecha_limite DATE NOT NULL,
    estado VARCHAR(15) NOT NULL,
    clave_xml VARCHAR(50),
    cedula_emisor VARCHAR(12),
    total_factura_crc BIGINT,
    total_iva_crc BIGINT,
    xml_path VARCHAR(500),
    mensaje_validacion VARCHAR(2000),
    revisada BOOLEAN NOT NULL DEFAULT FALSE,
    revisada_por BIGINT,
    fecha_revision TIMESTAMP,
    fecha_recibida TIMESTAMP,
    desglose_json TEXT,
    ultimo_recordatorio TIMESTAMP,
    recordatorios INTEGER NOT NULL DEFAULT 0,
    mensaje_receptor_estado VARCHAR(30),
    mensaje_receptor_detalle VARCHAR(500),
    mensaje_receptor_fecha TIMESTAMP,
    fecha_limite_mensaje_receptor DATE,
    xml_respuesta_path VARCHAR(500),
    respuesta_hacienda_estado VARCHAR(20),
    fecha_creacion TIMESTAMP NOT NULL,
    fecha_actualizacion TIMESTAMP NOT NULL,
    CONSTRAINT ck_factura_negocio_estado CHECK (estado IN
        ('PENDIENTE', 'RECIBIDA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA', 'NO_APLICA')),
    CONSTRAINT ck_factura_negocio_periodo CHECK (periodo_hasta >= periodo_desde)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_factura_negocio_empresa_periodo
    ON hot_click_factura_negocio_tb (fk_id_empresa, periodo_desde, periodo_hasta);
CREATE UNIQUE INDEX IF NOT EXISTS uq_factura_negocio_clave
    ON hot_click_factura_negocio_tb (clave_xml);
CREATE INDEX IF NOT EXISTS idx_factura_negocio_estado_limite
    ON hot_click_factura_negocio_tb (estado, fecha_limite);

-- Interruptor del mensaje receptor: apagado por defecto. Con el interruptor apagado no se firma ni se envía nada a Hacienda.
ALTER TABLE hot_click_config_fiscal_tb ADD COLUMN IF NOT EXISTS hacienda_mensaje_receptor_habilitado BOOLEAN NOT NULL DEFAULT FALSE;
-- Tolerancia interna (colones) al comparar la factura del negocio con lo que se le debe. Decisión interna: Hacienda no publica una.
ALTER TABLE hot_click_config_fiscal_tb ADD COLUMN IF NOT EXISTS tolerancia_factura_negocio_crc INTEGER NOT NULL DEFAULT 1;
-- Base de la factura del negocio: NETO (producto menos comisión) o BRUTO (precio del producto). Lo decide el contador del dueño.
ALTER TABLE hot_click_config_fiscal_tb ADD COLUMN IF NOT EXISTS base_factura_negocio VARCHAR(10) NOT NULL DEFAULT 'NETO';

-- Revisión de seguridad de la Fase 2 (aditivo):
-- cédula fiscal verificada al generar el registro (el XML se valida contra esta foto, no contra la actual);
ALTER TABLE hot_click_factura_negocio_tb ADD COLUMN IF NOT EXISTS cedula_fiscal_esperada VARCHAR(12);
-- bloqueo optimista contra dos subidas o aprobaciones a la vez;
ALTER TABLE hot_click_factura_negocio_tb ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
-- el enlace de pago puede quedar atado a una factura: solo esa factura lo cancela al aprobarse.
ALTER TABLE hot_click_enlace_pago_onvo_tb ADD COLUMN IF NOT EXISTS fk_factura_negocio BIGINT;
CREATE INDEX IF NOT EXISTS idx_enlace_pago_factura_negocio ON hot_click_enlace_pago_onvo_tb (fk_factura_negocio);
