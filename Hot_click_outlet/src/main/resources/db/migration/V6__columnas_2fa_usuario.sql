-- ============================================================
-- V6: Columnas de autenticación de dos factores (2FA/TOTP)
--     y códigos de recuperación en la tabla de usuarios.
-- ============================================================

ALTER TABLE hot_click_usuario_tb
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS two_factor_secret   VARCHAR(100),
    ADD COLUMN IF NOT EXISTS recovery_codes      TEXT;
