-- V116: cuentas donde el vendedor recibe ingresos (SINPE / IBAN / tarjeta referencia)
CREATE TABLE IF NOT EXISTS hot_click_metodo_cobro_tb (
    id_metodo_cobro BIGSERIAL PRIMARY KEY,
    fk_id_empresa   BIGINT NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    tipo            VARCHAR(20) NOT NULL,
    destino         VARCHAR(80) NOT NULL,
    mascara         VARCHAR(60) NOT NULL,
    predeterminado  BOOLEAN NOT NULL DEFAULT FALSE,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metodo_cobro_empresa
    ON hot_click_metodo_cobro_tb (fk_id_empresa, activo, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_metodo_cobro_predeterminado
    ON hot_click_metodo_cobro_tb (fk_id_empresa)
    WHERE predeterminado = TRUE AND activo = TRUE;
