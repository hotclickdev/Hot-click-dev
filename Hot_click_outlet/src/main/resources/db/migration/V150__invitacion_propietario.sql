-- Enlace de un solo uso para que un admin asigne el propietario de un negocio.
CREATE TABLE IF NOT EXISTS hot_click_invitacion_propietario_tb (
    id_invitacion     BIGSERIAL    PRIMARY KEY,
    fk_id_empresa     BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    token_hash        VARCHAR(64)  NOT NULL,
    correo_destino    VARCHAR(200),
    telefono_destino  VARCHAR(30),
    fk_id_creada_por  BIGINT       REFERENCES hot_click_usuario_tb(id_usuario),
    expira_en         TIMESTAMP    NOT NULL,
    usada_en          TIMESTAMP,
    fk_id_usada_por   BIGINT       REFERENCES hot_click_usuario_tb(id_usuario),
    revocada_en       TIMESTAMP,
    fecha_creacion    TIMESTAMP    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invitacion_propietario_token
    ON hot_click_invitacion_propietario_tb (token_hash);

-- Una sola invitación vigente por negocio. Al generar otra, la anterior se revoca.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitacion_propietario_activa
    ON hot_click_invitacion_propietario_tb (fk_id_empresa)
    WHERE usada_en IS NULL AND revocada_en IS NULL;

CREATE INDEX IF NOT EXISTS idx_invitacion_propietario_empresa
    ON hot_click_invitacion_propietario_tb (fk_id_empresa);
