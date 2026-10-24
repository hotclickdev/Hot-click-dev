-- fix/registro-cedula-otp: la semilla de V1 (REGISTRO, RESET_PASSWORD) cayó en la tabla citada
-- "HOT_CLICK_TIPO_OTP_TB" (MAYÚSCULAS), distinta de hot_click_tipo_otp_tb que usa la entidad TipoOtp.
-- Aditiva e idempotente: misma DDL que V171_1 si falta la tabla; inserta solo lo que no existe.
CREATE TABLE IF NOT EXISTS hot_click_tipo_otp_tb (
    id_tipo_otp           SERIAL PRIMARY KEY,
    nombre                VARCHAR(30)  NOT NULL UNIQUE,
    tiempo_expiracion_seg INTEGER      NOT NULL DEFAULT 300,
    longitud_codigo       INTEGER      NOT NULL DEFAULT 6,
    fk_id_estado          INTEGER      NOT NULL DEFAULT 1
);

INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado)
SELECT 'REGISTRO', 300, 6, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tipo_otp_tb WHERE nombre = 'REGISTRO');

INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado)
SELECT 'RESET_PASSWORD', 300, 6, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tipo_otp_tb WHERE nombre = 'RESET_PASSWORD');
