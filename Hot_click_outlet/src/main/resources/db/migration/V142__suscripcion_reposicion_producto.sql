-- V142: "Avisame cuando vuelva" — interés de clientes en un producto agotado.
-- Guarda el interés (email + usuario opcional si tenía sesión). El envío
-- automático del correo cuando el producto vuelve a stock queda pendiente
-- (NUEVO · por programar); esta tabla solo persiste la suscripción.
CREATE TABLE IF NOT EXISTS hot_click_suscripcion_reposicion_tb (
    id_suscripcion_reposicion BIGSERIAL PRIMARY KEY,
    fk_id_producto            BIGINT NOT NULL REFERENCES hot_click_producto_tb(id_producto) ON DELETE CASCADE,
    fk_id_usuario             BIGINT REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE SET NULL,
    correo                    VARCHAR(160) NOT NULL,
    fecha_creacion            TIMESTAMP NOT NULL DEFAULT NOW(),
    notificado                BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_notificacion        TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_suscripcion_reposicion_producto_correo
    ON hot_click_suscripcion_reposicion_tb (fk_id_producto, correo);

CREATE INDEX IF NOT EXISTS idx_suscripcion_reposicion_producto
    ON hot_click_suscripcion_reposicion_tb (fk_id_producto) WHERE notificado = FALSE;
