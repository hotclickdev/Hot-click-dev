CREATE TABLE IF NOT EXISTS hot_click_comprobante_sinpe_tb (
    id_comprobante   BIGSERIAL PRIMARY KEY,
    fk_id_pedido     BIGINT        NOT NULL REFERENCES hot_click_pedido_tb(id_pedido),
    url_comprobante  VARCHAR(1000) NOT NULL,
    nombre_remitente VARCHAR(150)  NOT NULL,
    estado           VARCHAR(20)   NOT NULL DEFAULT 'PENDIENTE',
    fecha_subida     TIMESTAMP     NOT NULL,
    fecha_resolucion TIMESTAMP,
    notas_admin      VARCHAR(500),
    admin_id         BIGINT,
    admin_email      VARCHAR(150)
);
