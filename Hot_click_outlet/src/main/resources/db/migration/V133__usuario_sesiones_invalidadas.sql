-- V133: timestamp de corte para invalidar access tokens JWT ya emitidos.
-- Los JWT no tienen jti (no se pueden revocar uno por uno), pero un cambio de
-- contraseña o un reset de cuenta debe tumbar cualquier token emitido antes de
-- ese momento, aunque todavía no haya expirado (TTL access token: 15 min).
ALTER TABLE hot_click_usuario_tb
    ADD COLUMN IF NOT EXISTS sesiones_invalidadas_en TIMESTAMP;
