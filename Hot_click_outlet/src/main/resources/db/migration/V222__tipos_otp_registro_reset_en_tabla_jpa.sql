-- V222 (HC-CICD-002): siembra los tipos de OTP REGISTRO y RESET_PASSWORD en la tabla que lee JPA
-- (hot_click_tipo_otp_tb). V1 los insertó solo en la tabla vieja "HOT_CLICK_TIPO_OTP_TB" (mayúsculas),
-- así que en una base creada desde V1 forgot-password y el registro fallaban con
-- "tipo de OTP no configurado". Valores copiados de V1: 300 s, 6 dígitos, estado 1 (ACTIVO).
-- Idempotente: si la fila ya existe (prod) no hace nada; no edita filas existentes.
CREATE TABLE IF NOT EXISTS hot_click_tipo_otp_tb (
    id_tipo_otp           SERIAL PRIMARY KEY,
    nombre                VARCHAR(30)  NOT NULL UNIQUE,
    tiempo_expiracion_seg INTEGER      NOT NULL DEFAULT 300,
    longitud_codigo       INTEGER      NOT NULL DEFAULT 6,
    fk_id_estado          INTEGER      NOT NULL DEFAULT 1
);

INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado)
SELECT v.nombre, v.seg, v.longitud, v.estado
  FROM (VALUES ('REGISTRO', 300, 6, 1), ('RESET_PASSWORD', 300, 6, 1)) AS v(nombre, seg, longitud, estado)
 WHERE NOT EXISTS (SELECT 1 FROM hot_click_tipo_otp_tb t WHERE t.nombre = v.nombre);
