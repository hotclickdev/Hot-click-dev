-- seg-altos-2 (c): cuentas que solo entran por SSO (sin contraseña propia) confirman el borrado de
-- datos con un código enviado a su correo verificado. 10 minutos, 6 dígitos.
INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado)
SELECT 'RESET_DATOS', 600, 6, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tipo_otp_tb WHERE nombre = 'RESET_DATOS');
