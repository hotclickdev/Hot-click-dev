-- ============================================================
-- V19: Multi-method 2FA — TOTP + Email OTP
--
-- Adds per-user method tracking, TOTP replay protection,
-- expanded secret column for encrypted storage, and the
-- 2FA_LOGIN OTP type for email-based second factor.
--
-- All changes are non-destructive (IF NOT EXISTS / IF NOT EXISTS).
-- Existing TOTP users are backfilled to two_factor_methods='TOTP'.
-- ============================================================

-- 1. New columns on usuario table
ALTER TABLE hot_click_usuario_tb
    ADD COLUMN IF NOT EXISTS two_factor_methods  VARCHAR(50)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS totp_last_used_otp  VARCHAR(10)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS totp_last_used_at   TIMESTAMP    DEFAULT NULL;

-- 2. Expand two_factor_secret to hold AES-GCM encrypted value
--    Format: ENC:<base64(IV+ciphertext+tag)> ~ 68 chars; 200 is safe future headroom
ALTER TABLE hot_click_usuario_tb
    ALTER COLUMN two_factor_secret TYPE VARCHAR(200);

-- 3. Backfill: existing TOTP users get methods='TOTP'
UPDATE hot_click_usuario_tb
SET    two_factor_methods = 'TOTP'
WHERE  two_factor_enabled = true
  AND  two_factor_methods IS NULL;

-- 4. Seed the 2FA_LOGIN OTP type (5 min expiry, 6 digits)
--    Used when a user selects Email OTP as their second factor during login.
INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado)
SELECT '2FA_LOGIN', 300, 6, 1
WHERE  NOT EXISTS (
    SELECT 1 FROM hot_click_tipo_otp_tb WHERE nombre = '2FA_LOGIN'
);
