-- Tablas que en producción crea Flyway y Hibernate no genera (sin @Entity).
-- Solo las usa el perfil test / H2 local.
CREATE TABLE IF NOT EXISTS hot_click_rol_permiso_tb (
    fk_id_rol INTEGER NOT NULL,
    fk_id_permiso INTEGER NOT NULL,
    fk_id_estado INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (fk_id_rol, fk_id_permiso)
);
CREATE TABLE IF NOT EXISTS hot_click_rate_limit_tb (
    bucket_key VARCHAR(200) PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS shedlock (
    name VARCHAR(64) NOT NULL,
    lock_until TIMESTAMP NOT NULL,
    locked_at TIMESTAMP NOT NULL,
    locked_by VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);
CREATE TABLE IF NOT EXISTS hot_click_empresa_feature_tb (
    fk_id_empresa BIGINT NOT NULL,
    fk_id_flag BIGINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_exp TIMESTAMP,
    PRIMARY KEY (fk_id_empresa, fk_id_flag)
);
