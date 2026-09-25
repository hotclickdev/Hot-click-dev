-- V137: refresh tokens almacenados como SHA-256 (hex), no en claro.
-- INVALIDA sesiones existentes: los UUID en claro no coinciden con el hash
-- que ahora busca RefreshTokenRepository.findByToken; se eliminan para no
-- dejar secretos recuperables en la tabla.
DELETE FROM hot_click_refresh_token_tb;

-- La columna token (VARCHAR 255) ya alcanza para SHA-256 hex (64 chars).
-- Índice existente idx_refresh_token sigue siendo válido.
COMMENT ON COLUMN hot_click_refresh_token_tb.token IS
    'SHA-256 hex del refresh token opaco; el valor en claro solo viaja en cookie HttpOnly';
