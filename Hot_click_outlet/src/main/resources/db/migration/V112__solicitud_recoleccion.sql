-- V112: solicitudes de recolección y entrega (mensajería HOTCLICK, solo GAM por ahora)
CREATE TABLE IF NOT EXISTS hot_click_solicitud_recoleccion_tb (
    id_solicitud_recoleccion BIGSERIAL PRIMARY KEY,
    fk_id_empresa            BIGINT NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_usuario            BIGINT REFERENCES hot_click_usuario_tb(id_usuario),
    zona                     VARCHAR(20) NOT NULL,
    direccion_recoleccion    TEXT NOT NULL,
    contacto_recoleccion     VARCHAR(120) NOT NULL,
    telefono_recoleccion     VARCHAR(30) NOT NULL,
    direccion_entrega        TEXT NOT NULL,
    contacto_entrega         VARCHAR(120) NOT NULL,
    telefono_entrega         VARCHAR(30) NOT NULL,
    notas                    TEXT,
    estado                   VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    tarifa_colones           INTEGER,
    notas_admin              TEXT,
    fecha_creacion           TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_cotizacion         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recoleccion_empresa
    ON hot_click_solicitud_recoleccion_tb (fk_id_empresa, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_recoleccion_estado
    ON hot_click_solicitud_recoleccion_tb (estado);
