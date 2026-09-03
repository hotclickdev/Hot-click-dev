-- V113: reportes de producto por clientes (moderación marketplace)
CREATE TABLE IF NOT EXISTS hot_click_reporte_producto_tb (
    id_reporte_producto BIGSERIAL PRIMARY KEY,
    fk_id_producto      BIGINT NOT NULL REFERENCES hot_click_producto_tb(id_producto),
    fk_id_usuario       BIGINT REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE SET NULL,
    motivo              VARCHAR(80) NOT NULL,
    detalle             TEXT,
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    notas_admin         TEXT,
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_resolucion    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reporte_producto_estado
    ON hot_click_reporte_producto_tb (estado, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_reporte_producto_producto
    ON hot_click_reporte_producto_tb (fk_id_producto);
