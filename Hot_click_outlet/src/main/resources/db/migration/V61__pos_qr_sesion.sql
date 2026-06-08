-- V61: POS QR Payment Sessions
-- Almacena sesiones de pago generadas desde el POS mediante QR.
-- El cajero crea la sesión, el cliente escanea el QR y paga (SINPE o Stripe).

CREATE TABLE IF NOT EXISTS hot_click_pos_qr_sesion_tb (
    id_qr_sesion      BIGSERIAL    PRIMARY KEY,
    token             VARCHAR(64)  UNIQUE NOT NULL,
    fk_id_empresa     BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_usuario     BIGINT       NOT NULL REFERENCES hot_click_usuario_tb(id_usuario),
    fk_id_turno       BIGINT       REFERENCES hot_click_turno_caja_tb(id_turno),
    items_json        TEXT         NOT NULL,
    total             INTEGER      NOT NULL,
    metodo_pago       VARCHAR(20)  NOT NULL DEFAULT 'TARJETA',
    estado            VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    fk_id_pedido      BIGINT,
    stripe_session_id VARCHAR(255),
    fecha_creacion    TIMESTAMP    NOT NULL DEFAULT NOW(),
    fecha_expiracion  TIMESTAMP    NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
    notas             TEXT,
    CONSTRAINT chk_pos_qr_estado CHECK (estado IN ('PENDIENTE','PAGADO','EXPIRADO','CANCELADO')),
    CONSTRAINT chk_pos_qr_metodo CHECK (metodo_pago IN ('SINPE','TARJETA'))
);

CREATE INDEX IF NOT EXISTS idx_pos_qr_token    ON hot_click_pos_qr_sesion_tb (token);
CREATE INDEX IF NOT EXISTS idx_pos_qr_empresa  ON hot_click_pos_qr_sesion_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_pos_qr_pendiente ON hot_click_pos_qr_sesion_tb (estado, fecha_expiracion)
    WHERE estado = 'PENDIENTE';
