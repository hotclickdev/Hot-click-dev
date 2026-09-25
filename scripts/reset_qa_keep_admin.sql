-- ONE-SHOT: borra productos, negocios y usuarios registrados.
-- Conserva admin + 3 cuentas QA (Emprendedor / Pyme / Negocio Plus) y sus empresas/bodegas.
-- NO es migración Flyway. Correr a mano en PostgreSQL (con backup).
-- Conserva catálogo de sistema: roles, planes, estados, categorías, permisos.
-- No toca Storage, Clerk, embeddings RAG ni publicaciones externas.

BEGIN;

CREATE TEMP TABLE keep_correo (correo TEXT PRIMARY KEY);
INSERT INTO keep_correo (correo) VALUES
    ('admin@hotclick.com'),
    ('qa.emprendedor.demo@hotclick.test'),
    ('qa.pyme.demo@hotclick.test'),
    ('qa.negocioplus.demo@hotclick.test'),
    ('emprendedor@hotclick.test'),
    ('pyme@hotclick.test'),
    ('negocioplus@hotclick.test'),
    ('mostrador@hotclick.internal');

CREATE TEMP TABLE keep_usuario AS
SELECT u.id_usuario
FROM hot_click_usuario_tb u
WHERE lower(u.correo) IN (SELECT correo FROM keep_correo)
UNION
SELECT ur.fk_id_usuario
FROM hot_click_usuario_rol_tb ur
JOIN hot_click_rol_tb r ON r.id_rol = ur.fk_id_rol
WHERE r.nombre_rol = 'ADMIN';

CREATE TEMP TABLE keep_empresa AS
SELECT DISTINCT e.id_empresa
FROM hot_click_empresa_tb e
WHERE lower(e.correo_empresa) IN (SELECT correo FROM keep_correo)
   OR e.id_empresa IN (
        SELECT u.fk_id_empresa
        FROM hot_click_usuario_tb u
        WHERE u.id_usuario IN (SELECT id_usuario FROM keep_usuario)
          AND u.fk_id_empresa IS NOT NULL
   );

CREATE OR REPLACE FUNCTION pg_temp.safe_exec(sql text) RETURNS void AS $$
BEGIN
    EXECUTE sql;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
END;
$$ LANGUAGE plpgsql;

-- Productos (todos) y filas que apuntan a producto
SELECT pg_temp.safe_exec('DELETE FROM hot_click_pedido_item_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_carrito_item_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_cotizacion_item_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_orden_compra_item_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_producto_imagen_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_movimiento_stock_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_publicacion_fb_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_reporte_producto_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_solicitud_garantia_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_precio_sugerido_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_encargo_evento_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_encargo_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_forecast_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_producto_tb');

-- Pedidos / carritos / pagos
SELECT pg_temp.safe_exec('DELETE FROM hot_click_split_pago_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_pago_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_transaccion_pago_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_comprobante_sinpe_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_comprobante_fiscal_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_pedido_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_carrito_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_carrito_abandonado_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_pos_qr_sesion_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_turno_caja_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_encargo_evento_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_testimonio_tb');
SELECT pg_temp.safe_exec('DELETE FROM hot_click_wallet_transaccion_tb');

-- Negocios que no se conservan
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_cotizacion_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_encargo_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_solicitud_servicio_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_solicitud_recoleccion_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_solicitud_aprobacion_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_ticket_soporte_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_gift_card_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_metodo_cobro_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_sucursal_tb
     WHERE fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_marca_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_proveedor_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_gasto_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_orden_compra_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_factura_saas_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_billing_ledger_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_payout_request_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_wallet_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_suscripcion_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_miembro_empresa_tb
     WHERE fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
        OR fk_id_usuario NOT IN (SELECT id_usuario FROM keep_usuario)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_telegram_vinculacion_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);

-- Quitar referencia a bodegas que se van a borrar
SELECT pg_temp.safe_exec($q$
    UPDATE hot_click_empresa_tb
       SET fk_id_bodega_venta_online = NULL
     WHERE id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);

SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_bodega_tb
     WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM keep_empresa)
$q$);

SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_refresh_token_tb
     WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM keep_usuario)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_webauthn_credential_tb
     WHERE user_id NOT IN (SELECT id_usuario FROM keep_usuario)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_codigo_otp_tb
     WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM keep_usuario)
$q$);
SELECT pg_temp.safe_exec($q$
    DELETE FROM hot_click_usuario_rol_tb
     WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM keep_usuario)
$q$);

UPDATE hot_click_usuario_tb
   SET fk_id_empresa = NULL
 WHERE id_usuario NOT IN (SELECT id_usuario FROM keep_usuario);

DELETE FROM hot_click_usuario_tb
 WHERE id_usuario NOT IN (SELECT id_usuario FROM keep_usuario);

DELETE FROM hot_click_empresa_tb
 WHERE id_empresa NOT IN (SELECT id_empresa FROM keep_empresa);

-- Próximo producto de la plataforma empieza en 1 (tabla vacía).
SELECT setval(pg_get_serial_sequence('hot_click_producto_tb', 'id_producto'), 1, false);

COMMIT;
