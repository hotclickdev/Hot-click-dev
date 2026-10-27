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

-- Cupo de altas gratis del plan Emprendedor (V127). Sin @Entity (se usa por JdbcTemplate), Hibernate update
-- no la crea y el baseline salta V127: sin esto el alta de negocio falla en base vacía (tx abortada -> 500).
-- Misma DDL y seed que V127. Se omite su UPDATE de "usados" (cuenta empresas, tabla que aún no existe) porque
-- en base vacía no hay empresas: usados=0.
CREATE TABLE IF NOT EXISTS hot_click_cupo_emprendedor_tb (
    id     SMALLINT PRIMARY KEY,
    limite INTEGER NOT NULL DEFAULT 70,
    usados INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT cupo_emprendedor_unica CHECK (id = 1),
    CONSTRAINT cupo_emprendedor_rango CHECK (usados >= 0 AND limite > 0)
);

INSERT INTO hot_click_cupo_emprendedor_tb (id, limite, usados)
SELECT 1, 70, 0
WHERE NOT EXISTS (SELECT 1 FROM hot_click_cupo_emprendedor_tb WHERE id = 1);

-- ---------------------------------------------------------------------------------------------------------------
-- Tablas sin @Entity que el codigo usa por JdbcTemplate o query nativa (barrido V1..V199)
-- Hibernate update no las crea y el baseline salta sus migraciones: sin esto fallan en base vacia.
-- Misma DDL que la migracion de origen. Las FK hacia tablas entity (empresa, usuario, producto) se omiten a
-- proposito porque el bootstrap corre antes que Hibernate y esas tablas aun no existen. Solo se crean FK entre
-- tablas de este mismo archivo.
-- ---------------------------------------------------------------------------------------------------------------

-- V65 customer_memory: memoria del visitante anonimo (CustomerMemoryService)
CREATE TABLE IF NOT EXISTS customer_memory (
    id               BIGSERIAL    PRIMARY KEY,
    visitor_id       VARCHAR(36)  NOT NULL,
    summary          TEXT,
    interests        JSONB        NOT NULL DEFAULT '[]',
    preferred_brands JSONB        NOT NULL DEFAULT '[]',
    estimated_budget BIGINT,
    last_visit       TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_memory_visitor UNIQUE (visitor_id)
);

-- V90 chat_log: analytics del chat publico (PublicChatDiscoveryHandler y PublicChatAdvisorHandler)
CREATE TABLE IF NOT EXISTS hot_click_chat_log_tb (
    id                    BIGSERIAL    PRIMARY KEY,
    fk_id_empresa         BIGINT       NOT NULL,
    idioma                VARCHAR(5)   NOT NULL DEFAULT 'es',
    intencion             VARCHAR(30),
    mensaje_length        INT,
    productos_encontrados INT          NOT NULL DEFAULT 0,
    budget_detectado      BIGINT,
    terminos_busqueda     TEXT,
    fuera_horario         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_log_empresa_ts
    ON hot_click_chat_log_tb (fk_id_empresa, created_at DESC);

-- V63 y V70 asistente de compras: sesiones y mensajes (ShoppingAssistant*, DataRetentionScheduler, AdminResetController)
CREATE TABLE IF NOT EXISTS hot_click_chat_sesion_tb (
    id_sesion         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    fk_id_empresa     BIGINT       NOT NULL,
    fk_id_usuario     BIGINT,
    canal             VARCHAR(20)  NOT NULL DEFAULT 'WEB',
    iniciada_en       TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    ultimo_mensaje_en TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    metadatos         JSONB        NOT NULL DEFAULT '{}',
    CONSTRAINT chk_chat_sesion_canal CHECK (canal IN ('WEB', 'WHATSAPP', 'QR', 'EMBED'))
);

CREATE TABLE IF NOT EXISTS hot_click_chat_mensaje_shopping_tb (
    id_mensaje     BIGSERIAL    PRIMARY KEY,
    fk_id_sesion   UUID         NOT NULL REFERENCES hot_click_chat_sesion_tb (id_sesion) ON DELETE CASCADE,
    fk_id_empresa  BIGINT       NOT NULL,
    rol            VARCHAR(20)  NOT NULL,
    contenido      TEXT         NOT NULL,
    tokens_entrada INTEGER      NOT NULL DEFAULT 0,
    tokens_salida  INTEGER      NOT NULL DEFAULT 0,
    productos_refs JSONB        NOT NULL DEFAULT '[]',
    fecha_creacion TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    feedback       SMALLINT,
    CONSTRAINT chk_chat_msg_rol CHECK (rol IN ('user', 'assistant', 'system')),
    CONSTRAINT chk_chat_feedback CHECK (feedback IN (1, -1))
);

CREATE INDEX IF NOT EXISTS idx_chat_sesion_empresa
    ON hot_click_chat_sesion_tb (fk_id_empresa, ultimo_mensaje_en DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sesion_expiry
    ON hot_click_chat_sesion_tb (ultimo_mensaje_en);

CREATE INDEX IF NOT EXISTS idx_chat_sesion_usuario
    ON hot_click_chat_sesion_tb (fk_id_usuario);

CREATE INDEX IF NOT EXISTS idx_chat_msg_sesion
    ON hot_click_chat_mensaje_shopping_tb (fk_id_sesion, fecha_creacion ASC);

CREATE INDEX IF NOT EXISTS idx_chat_msg_empresa_fecha
    ON hot_click_chat_mensaje_shopping_tb (fk_id_empresa, fecha_creacion DESC);

-- V33 consecutivo fiscal por empresa y tipo (ConsecutivoFiscalService). Las filas las crea el servicio con upsert
CREATE TABLE IF NOT EXISTS hot_click_consecutivo_fiscal_tb (
    fk_id_empresa BIGINT      NOT NULL,
    tipo          VARCHAR(2)  NOT NULL,
    ultimo_numero BIGINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (fk_id_empresa, tipo)
);

-- V84 consecutivo de cotizaciones B2B (CotizacionConsecutivoGenerator)
CREATE TABLE IF NOT EXISTS hot_click_cotizacion_consecutivo_tb (
    empresa_id    BIGINT PRIMARY KEY,
    ultimo_numero BIGINT NOT NULL DEFAULT 0
);

-- V66 solicitudes especiales de producto (SolicitudEspecialController)
CREATE TABLE IF NOT EXISTS hot_click_solicitud_especial_tb (
    id            BIGSERIAL    PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    whatsapp      VARCHAR(20)  NOT NULL,
    correo        VARCHAR(150),
    descripcion   TEXT,
    imagen_url    TEXT,
    estado        VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    creado_en     TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    fk_id_empresa BIGINT
);

CREATE INDEX IF NOT EXISTS idx_solicitud_especial_estado
    ON hot_click_solicitud_especial_tb (estado);

CREATE INDEX IF NOT EXISTS idx_solicitud_especial_empresa
    ON hot_click_solicitud_especial_tb (fk_id_empresa);

-- V45 tasas de cambio de referencia (MultipaisController). El seed evita una lista vacia en el selector de moneda
CREATE TABLE IF NOT EXISTS hot_click_tasa_cambio_tb (
    id_tasa        BIGSERIAL     PRIMARY KEY,
    moneda_desde   VARCHAR(3)    NOT NULL DEFAULT 'CRC',
    moneda_hacia   VARCHAR(3)    NOT NULL,
    tasa           NUMERIC(15,6) NOT NULL,
    fecha_vigencia DATE          NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (moneda_desde, moneda_hacia, fecha_vigencia)
);

INSERT INTO hot_click_tasa_cambio_tb (moneda_desde, moneda_hacia, tasa)
SELECT 'CRC', 'USD', 0.00193
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tasa_cambio_tb WHERE moneda_desde = 'CRC' AND moneda_hacia = 'USD');

INSERT INTO hot_click_tasa_cambio_tb (moneda_desde, moneda_hacia, tasa)
SELECT 'CRC', 'EUR', 0.00177
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tasa_cambio_tb WHERE moneda_desde = 'CRC' AND moneda_hacia = 'EUR');

INSERT INTO hot_click_tasa_cambio_tb (moneda_desde, moneda_hacia, tasa)
SELECT 'CRC', 'MXN', 0.03300
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tasa_cambio_tb WHERE moneda_desde = 'CRC' AND moneda_hacia = 'MXN');

INSERT INTO hot_click_tasa_cambio_tb (moneda_desde, moneda_hacia, tasa)
SELECT 'CRC', 'COP', 7.86000
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tasa_cambio_tb WHERE moneda_desde = 'CRC' AND moneda_hacia = 'COP');

INSERT INTO hot_click_tasa_cambio_tb (moneda_desde, moneda_hacia, tasa)
SELECT 'CRC', 'PEN', 0.00725
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tasa_cambio_tb WHERE moneda_desde = 'CRC' AND moneda_hacia = 'PEN');

INSERT INTO hot_click_tasa_cambio_tb (moneda_desde, moneda_hacia, tasa)
SELECT 'CRC', 'GTQ', 0.01506
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tasa_cambio_tb WHERE moneda_desde = 'CRC' AND moneda_hacia = 'GTQ');

INSERT INTO hot_click_tasa_cambio_tb (moneda_desde, moneda_hacia, tasa)
SELECT 'CRC', 'HNL', 0.04740
WHERE NOT EXISTS (SELECT 1 FROM hot_click_tasa_cambio_tb WHERE moneda_desde = 'CRC' AND moneda_hacia = 'HNL');

-- V1 direcciones de usuario (ResetPlataformaKeepQaService). Tabla legacy de V1 con nombre en mayusculas entre comillas
-- aqui se crea en minusculas, que es como la consulta el codigo. Sin FK a usuario, distrito ni estado (no existen aun)
CREATE TABLE IF NOT EXISTS hot_click_usuario_direccion_tb (
    id_direccion       SERIAL        PRIMARY KEY,
    detalles_direccion TEXT          NOT NULL,
    latitud            DECIMAL(10,8),
    longitud           DECIMAL(11,8),
    es_principal       BOOLEAN       DEFAULT FALSE,
    tipo_direccion     VARCHAR(20)   DEFAULT 'ENVIO',
    fk_id_usuario      INTEGER       NOT NULL,
    fk_id_distrito     INTEGER,
    fk_id_estado       INTEGER       NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_usuario_direccion_usuario
    ON hot_click_usuario_direccion_tb (fk_id_usuario);

-- Marcador: deja el esquema "no vacío" para flyway.baseline()
CREATE TABLE IF NOT EXISTS hotclick_dev_flyway_bootstrap (
    ok BOOLEAN NOT NULL DEFAULT TRUE
);
