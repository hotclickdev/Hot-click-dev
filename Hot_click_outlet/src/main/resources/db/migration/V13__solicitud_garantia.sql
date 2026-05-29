-- V13: Tabla de solicitudes de garantía
CREATE TABLE IF NOT EXISTS hot_click_solicitud_garantia_tb (
    id_solicitud_garantia BIGSERIAL PRIMARY KEY,
    fk_id_usuario         BIGINT NOT NULL REFERENCES hot_click_usuario_tb(id_usuario),
    fk_id_producto        BIGINT NOT NULL REFERENCES hot_click_producto_tb(id_producto),
    fk_id_pedido          BIGINT REFERENCES hot_click_pedido_tb(id_pedido),
    descripcion           TEXT   NOT NULL,
    estado                VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    notas_admin           TEXT,
    fecha_creacion        TIMESTAMP NOT NULL DEFAULT NOW(),
    estado_registro       INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sol_garantia_usuario
    ON hot_click_solicitud_garantia_tb (fk_id_usuario);

CREATE INDEX IF NOT EXISTS idx_sol_garantia_estado
    ON hot_click_solicitud_garantia_tb (estado);
