-- V88: Credenciales WebAuthn / FIDO2 para llaves de seguridad físicas
CREATE TABLE IF NOT EXISTS hot_click_webauthn_credential_tb (
    id_credential   BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE CASCADE,
    credential_id   TEXT         NOT NULL UNIQUE,   -- Base64URL del credentialId del autenticador
    public_key_cose TEXT         NOT NULL,           -- Base64URL de la clave pública en formato COSE
    sign_count      BIGINT       NOT NULL DEFAULT 0, -- Contador de usos (anti-replay)
    aaguid          TEXT,                            -- Identificador del modelo de autenticador
    transports      TEXT,                            -- JSON array: ["usb","nfc","ble","internal"]
    device_name     VARCHAR(200),                    -- Nombre amigable dado por el usuario
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webauthn_user_id       ON hot_click_webauthn_credential_tb(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON hot_click_webauthn_credential_tb(credential_id);
