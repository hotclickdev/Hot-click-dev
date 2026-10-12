-- seg-altos-2 (c): cuentas que solo entran por SSO (sin contraseña propia) confirman el borrado de
-- datos con un código enviado a su correo verificado. 10 minutos, 6 dígitos.
-- Robusta en base vacía (E1b: baseline dev en V171, Hibernate todavía no creó tablas) y en bases
-- existentes: misma DDL que V1, solo si falta; el insert es idempotente.
CREATE TABLE IF NOT EXISTS hot_click_tipo_otp_tb (
    id_tipo_otp           SERIAL PRIMARY KEY,
    nombre                VARCHAR(30)  NOT NULL UNIQUE,
    tiempo_expiracion_seg INTEGER      NOT NULL DEFAULT 300,
    longitud_codigo       INTEGER      NOT NULL DEFAULT 6,
    fk_id_estado          INTEGER      NOT NULL DEFAULT 1
);

INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado)
SELECT 'RESET_DATOS', 600, 6, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tipo_otp_tb WHERE nombre = 'RESET_DATOS');
