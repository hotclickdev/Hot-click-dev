-- A3 CAJERO: anulaciones y devoluciones de ventas POS. Aditiva: solo tablas nuevas.
-- Venta POS -> turno de caja en que se cobró (las ventas viejas no tienen fila: se tratan como de turno cerrado).
CREATE TABLE IF NOT EXISTS hot_click_pos_venta_turno_tb (
    id_venta_turno  BIGSERIAL PRIMARY KEY,
    fk_id_pedido    BIGINT    NOT NULL,
    fk_id_turno     BIGINT    NOT NULL REFERENCES hot_click_turno_caja_tb(id_turno),
    creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_venta_turno_pedido ON hot_click_pos_venta_turno_tb (fk_id_pedido);
CREATE INDEX IF NOT EXISTS ix_pos_venta_turno_turno ON hot_click_pos_venta_turno_tb (fk_id_turno);

-- Bitácora de anulaciones (ANULACION) y devoluciones (DEVOLUCION): quién, por qué y cuándo.
CREATE TABLE IF NOT EXISTS hot_click_pos_anulacion_tb (
    id_anulacion    BIGSERIAL PRIMARY KEY,
    tipo            VARCHAR(20)  NOT NULL,
    fk_id_pedido    BIGINT       NOT NULL,
    fk_id_empresa   BIGINT       NOT NULL,
    fk_id_turno     BIGINT,
    estado_turno    VARCHAR(20),
    fk_id_usuario   BIGINT       NOT NULL,
    rol_actor       VARCHAR(30)  NOT NULL,
    motivo          VARCHAR(500) NOT NULL,
    monto           INTEGER,
    fecha           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_pos_anulacion_empresa ON hot_click_pos_anulacion_tb (fk_id_empresa, fecha);
CREATE INDEX IF NOT EXISTS ix_pos_anulacion_pedido ON hot_click_pos_anulacion_tb (fk_id_pedido);
