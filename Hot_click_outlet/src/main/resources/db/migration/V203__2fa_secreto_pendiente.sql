-- Secreto TOTP pendiente: /2fa/setup ya no pisa el secreto vigente.
-- El secreto nuevo queda aquí hasta que /2fa/activate valida un código; entonces pasa a two_factor_secret.
-- Solo aditivo: columna nueva y nullable (mismo largo que two_factor_secret).
ALTER TABLE hot_click_usuario_tb
    ADD COLUMN IF NOT EXISTS two_factor_pending_secret VARCHAR(200) DEFAULT NULL;
