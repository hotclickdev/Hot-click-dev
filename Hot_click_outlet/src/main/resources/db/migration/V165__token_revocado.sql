-- Denylist de JWT por jti: finalizar «Ver como el negocio», pasar a modo escritura o cerrar sesión
-- revoca el token aunque no haya vencido. expira_en = exp del token; un @Scheduled purga los vencidos.
CREATE TABLE IF NOT EXISTS hot_click_token_revocado_tb (
    jti        VARCHAR(64)  PRIMARY KEY,
    expira_en  TIMESTAMP    NOT NULL,
    motivo     VARCHAR(40)  NOT NULL,
    creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_token_revocado_expira ON hot_click_token_revocado_tb (expira_en);
