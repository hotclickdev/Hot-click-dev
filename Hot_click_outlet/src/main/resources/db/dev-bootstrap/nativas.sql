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

-- Catálogo de tipos de OTP. Aunque TipoOtp es @Entity, el bootstrap corre ANTES de que
-- Hibernate cree tablas, y V1..VN (que sembraban los tipos) no se rejuegan en dev: sin esto,
-- POST /api/auth/send-verification da 400 "Tipo de OTP no configurado: REGISTRO".
-- Misma DDL que V1/V171_1 (Hibernate update no la toca) y seeds idempotentes (WHERE NOT EXISTS,
-- sin depender de que exista el UNIQUE). Fuentes: V1 (REGISTRO, RESET_PASSWORD),
-- V19 (2FA_LOGIN), V171_1 (RESET_DATOS).
CREATE TABLE IF NOT EXISTS hot_click_tipo_otp_tb (
    id_tipo_otp           SERIAL PRIMARY KEY,
    nombre                VARCHAR(30)  NOT NULL UNIQUE,
    tiempo_expiracion_seg INTEGER      NOT NULL DEFAULT 300,
    longitud_codigo       INTEGER      NOT NULL DEFAULT 6,
    fk_id_estado          INTEGER      NOT NULL DEFAULT 1
);

INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado)
SELECT 'REGISTRO', 300, 6, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tipo_otp_tb WHERE nombre = 'REGISTRO');

INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado)
SELECT 'RESET_PASSWORD', 300, 6, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tipo_otp_tb WHERE nombre = 'RESET_PASSWORD');

INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado)
SELECT '2FA_LOGIN', 300, 6, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tipo_otp_tb WHERE nombre = '2FA_LOGIN');

INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado)
SELECT 'RESET_DATOS', 600, 6, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tipo_otp_tb WHERE nombre = 'RESET_DATOS');

-- Marcador: deja el esquema "no vacío" para flyway.baseline()
CREATE TABLE IF NOT EXISTS hotclick_dev_flyway_bootstrap (
    ok BOOLEAN NOT NULL DEFAULT TRUE
);
