-- Tablas sin @Entity que el arranque en perfil `dev` necesita
-- cuando la base está vacía (Flyway hace baseline y no rejuega V1..V136).
-- Hibernate ddl-auto=update crea el resto desde las entidades.

CREATE TABLE IF NOT EXISTS hot_click_rate_limit_tb (
    bucket_key   VARCHAR(200) PRIMARY KEY,
    count        INTEGER      NOT NULL DEFAULT 0,
    window_start BIGINT       NOT NULL,
    expires_at   BIGINT       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rl_expires
    ON hot_click_rate_limit_tb (expires_at);

CREATE TABLE IF NOT EXISTS shedlock (
    name       VARCHAR(64)  NOT NULL,
    lock_until TIMESTAMP    NOT NULL,
    locked_at  TIMESTAMP    NOT NULL,
    locked_by  VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);

CREATE TABLE IF NOT EXISTS hot_click_rol_permiso_tb (
    fk_id_rol     INTEGER NOT NULL,
    fk_id_permiso INTEGER NOT NULL,
    fk_id_estado  INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (fk_id_rol, fk_id_permiso)
);

CREATE TABLE IF NOT EXISTS hot_click_empresa_feature_tb (
    fk_id_empresa BIGINT  NOT NULL,
    fk_id_flag    BIGINT  NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_exp     TIMESTAMP,
    PRIMARY KEY (fk_id_empresa, fk_id_flag)
);

-- Marcador: deja el esquema "no vacío" para flyway.baseline()
CREATE TABLE IF NOT EXISTS hotclick_dev_flyway_bootstrap (
    ok BOOLEAN NOT NULL DEFAULT TRUE
);
