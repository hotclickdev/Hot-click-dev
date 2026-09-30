-- Embudo de visita anónima (sin correo, nombre ni IP). Una fila por sesión del navegador.

CREATE TABLE IF NOT EXISTS hot_click_embudo_sesion_tb (
    id_embudo_sesion BIGSERIAL PRIMARY KEY,
    session_key      VARCHAR(36) NOT NULL UNIQUE,
    paso             VARCHAR(20) NOT NULL,
    motivo           VARCHAR(40),
    monto_carrito    INTEGER,
    actualizado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embudo_sesion_actualizado
    ON hot_click_embudo_sesion_tb (actualizado_en);
