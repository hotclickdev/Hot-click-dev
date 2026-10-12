-- seg-altos-2 (b) / P8-01: datos de CRM por negocio. Un cliente compartido (registrado en un negocio,
-- comprador en otro) tiene notas, puntos y segmento propios en cada negocio; el usuario global queda
-- solo para el negocio que lo registró.
CREATE TABLE IF NOT EXISTS hot_click_cliente_empresa_tb (
    id_cliente_empresa BIGSERIAL PRIMARY KEY,
    fk_id_empresa      BIGINT      NOT NULL REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    fk_id_usuario      BIGINT      NOT NULL REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE CASCADE,
    notas_internas     TEXT,
    puntos_fidelidad   INTEGER     NOT NULL DEFAULT 0,
    segmento           VARCHAR(30),
    origen             VARCHAR(12) NOT NULL DEFAULT 'COMPRA',
    fecha_alta         TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT uq_cliente_empresa UNIQUE (fk_id_empresa, fk_id_usuario),
    CONSTRAINT ck_cliente_empresa_origen CHECK (origen IN ('REGISTRO', 'COMPRA', 'MANUAL'))
);
CREATE INDEX IF NOT EXISTS ix_cliente_empresa_usuario ON hot_click_cliente_empresa_tb (fk_id_usuario);

-- Negocio de registro: copia lo que hoy vive en el usuario.
INSERT INTO hot_click_cliente_empresa_tb (fk_id_empresa, fk_id_usuario, notas_internas, puntos_fidelidad, segmento, origen)
SELECT u.fk_id_empresa_registro, u.id_usuario, u.notas_internas, COALESCE(u.puntos_fidelidad, 0), u.segmento, 'REGISTRO'
  FROM hot_click_usuario_tb u
 WHERE u.fk_id_empresa_registro IS NOT NULL
ON CONFLICT (fk_id_empresa, fk_id_usuario) DO NOTHING;

-- Negocios donde compró sin haberlo registrado: relación nueva, sin notas ni puntos heredados.
INSERT INTO hot_click_cliente_empresa_tb (fk_id_empresa, fk_id_usuario, origen)
SELECT DISTINCT p.fk_id_empresa, p.fk_id_usuario_final, 'COMPRA'
  FROM hot_click_pedido_tb p
 WHERE p.fk_id_empresa IS NOT NULL AND p.fk_id_usuario_final IS NOT NULL
ON CONFLICT (fk_id_empresa, fk_id_usuario) DO NOTHING;
