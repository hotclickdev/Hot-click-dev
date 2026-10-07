-- V156: sanción de plataforma, nota del operador, resolución de pedido y efectivo del mensajero.

CREATE TABLE IF NOT EXISTS hot_click_sancion_plataforma_tb (
    id_sancion              BIGSERIAL PRIMARY KEY,
    fk_id_empresa           BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    nivel_solicitado        VARCHAR(20)  NOT NULL,
    nivel_aplicado          VARCHAR(20)  NOT NULL,
    motivo                  VARCHAR(500) NOT NULL,
    politica                VARCHAR(80),
    inicio                  TIMESTAMP    NOT NULL,
    fin                     TIMESTAMP,
    activa                  BOOLEAN      NOT NULL DEFAULT TRUE,
    restituir_visibilidad   BOOLEAN      NOT NULL DEFAULT FALSE,
    admin_id                BIGINT,
    admin_email             VARCHAR(200),
    creada                  TIMESTAMP    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sancion_empresa_activa
    ON hot_click_sancion_plataforma_tb (fk_id_empresa, activa);

CREATE TABLE IF NOT EXISTS hot_click_nota_operador_tb (
    id_nota         BIGSERIAL PRIMARY KEY,
    fk_id_empresa   BIGINT        NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    nota            VARCHAR(1000) NOT NULL,
    proxima_accion  VARCHAR(300),
    bandeja         VARCHAR(40),
    admin_id        BIGINT,
    admin_email     VARCHAR(200),
    creada          TIMESTAMP     NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nota_operador_empresa
    ON hot_click_nota_operador_tb (fk_id_empresa, creada DESC);

ALTER TABLE hot_click_pedido_tb
    ADD COLUMN IF NOT EXISTS resolucion_operador VARCHAR(20),
    ADD COLUMN IF NOT EXISTS resolucion_nota VARCHAR(500);

ALTER TABLE hot_click_pedido_item_tb
    ADD COLUMN IF NOT EXISTS sin_inventario BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE hot_click_solicitud_recoleccion_tb
    ADD COLUMN IF NOT EXISTS efectivo_anotado INTEGER;
