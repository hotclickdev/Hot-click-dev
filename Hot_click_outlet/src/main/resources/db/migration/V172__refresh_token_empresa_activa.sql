-- P1-03: el refresh token recuerda el negocio elegido con cambiar-negocio / seleccionar-empresa,
-- así el refresh no vuelve al negocio principal ni al rol global de la cuenta.
ALTER TABLE hot_click_refresh_token_tb ADD COLUMN IF NOT EXISTS fk_id_empresa_activa BIGINT;
